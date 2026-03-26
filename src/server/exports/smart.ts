import "server-only";

import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

import type { BuiltExportDocument } from "@/server/exports/types";
import { trackAIGeneration } from "@/server/core/analytics/ai-generation";
import { getLanguageModel, getModel, type ModelAlias } from "@/server/core/ai/models";

type SmartVideoExportInput = {
  userId: string;
  title: string;
  sourceUrl: string;
  channelName: string | null;
  publishedAt: Date | null;
  summary: string | null;
  keyInsights: string[];
  transcriptLines: string[];
};

type SmartChatExportInput = {
  userId: string;
  title: string;
  libraryName: string;
  conversationLines: string[];
  sourceLines: string[];
};

const SMART_EXPORT_MODEL_ALIAS: ModelAlias = "chat.smart";

const smartVideoExportSchema = z.object({
  overview: z.string().trim().min(1),
  keyTakeaways: z.array(z.string().trim().min(1)).min(3).max(8),
  highlights: z.array(
    z.object({
      timestamp: z.string().trim().min(1),
      claim: z.string().trim().min(1),
      evidence: z.string().trim().min(1),
    }),
  ).min(3).max(8),
  surprisingOrContrarian: z.array(z.string().trim().min(1)).max(5),
  actionItems: z.array(z.string().trim().min(1)).max(8),
}).strict();

const smartChatExportSchema = z.object({
  overview: z.string().trim().min(1),
  keyConclusions: z.array(z.string().trim().min(1)).min(3).max(8),
  sourceBackedFindings: z.array(
    z.object({
      finding: z.string().trim().min(1),
      source: z.string().trim().min(1),
    }),
  ).max(8),
  surprisingOrContrarian: z.array(z.string().trim().min(1)).max(5),
  recommendedActions: z.array(z.string().trim().min(1)).max(8),
}).strict();

const MAX_TRANSCRIPT_CONTEXT_LINES = 180;
const MAX_CHAT_CONTEXT_LINES = 180;

export async function buildSmartVideoExportDocument(input: SmartVideoExportInput): Promise<BuiltExportDocument> {
  const startedAt = Date.now();

  const contextBlocks = [
    `Video title: ${input.title}`,
    `Source URL: ${input.sourceUrl}`,
    input.channelName ? `Channel: ${input.channelName}` : null,
    input.publishedAt ? `Published: ${formatDate(input.publishedAt)}` : null,
    input.summary ? `Existing summary:\n${input.summary}` : "Existing summary: (none)",
    input.keyInsights.length > 0
      ? `Existing key insights:\n${input.keyInsights.map((line) => `- ${line}`).join("\n")}`
      : "Existing key insights: (none)",
    [
      "Transcript excerpts (timestamped):",
      ...limitLines(input.transcriptLines, MAX_TRANSCRIPT_CONTEXT_LINES),
    ].join("\n"),
  ].filter((block): block is string => Boolean(block));

  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
      model: getLanguageModel(SMART_EXPORT_MODEL_ALIAS),
      temperature: 0.2,
      maxOutputTokens: getModel(SMART_EXPORT_MODEL_ALIAS).maxOutputTokens,
      output: Output.object({
        name: "SmartVideoExport",
        description: "Structured smart export sections for one video.",
        schema: smartVideoExportSchema,
      }),
      system: [
        "You are writing a research brief for analysts and writers who use YouTube as a primary source.",
        "Your audience publishes original analysis on Substack, Ghost, or similar platforms.",
        "",
        "Rules:",
        "- Ground every takeaway in a specific claim, data point, or example from the transcript.",
        "- For each highlight, state what the speaker claims and what evidence or reasoning they provide.",
        "- Identify points that contradict conventional wisdom, challenge popular assumptions, or present an unexpected angle. If none exist, return an empty array.",
        "- Write takeaways as specific, quotable statements — not generic topic labels.",
        "- Bad: 'The speaker discusses marketing strategies.' Good: 'Short-form vertical video drove 3x engagement for B2B at Company X, per the speaker.'",
        "- Do not invent facts, quotes, timestamps, or claims beyond the input.",
        "- Do not include internal system metadata or implementation details.",
        "- Keep the output concise and high-signal.",
      ].join("\n"),
      prompt: contextBlocks.join("\n\n"),
    });
  } catch (error) {
    const usage = NoObjectGeneratedError.isInstance(error) ? error.usage : undefined;

    await trackAIGeneration({
      userId: input.userId,
      operation: "smart_export_video",
      modelAlias: SMART_EXPORT_MODEL_ALIAS,
      startedAtMs: startedAt,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      totalTokens: usage?.totalTokens,
      status: "failed",
    });

    throw error;
  }

  await trackAIGeneration({
    userId: input.userId,
    operation: "smart_export_video",
    modelAlias: SMART_EXPORT_MODEL_ALIAS,
    startedAtMs: startedAt,
    inputTokens: result.totalUsage.inputTokens ?? 0,
    outputTokens: result.totalUsage.outputTokens ?? 0,
    totalTokens: result.totalUsage.totalTokens,
    status: "completed",
  });

  const structured = smartVideoExportSchema.parse(result.output);
  const modelId = getModel(SMART_EXPORT_MODEL_ALIAS).modelId;

  return {
    document: {
      title: input.title,
      metadataLines: compact([
        input.channelName ? `Channel: ${input.channelName}` : null,
        input.publishedAt ? `Published: ${formatDate(input.publishedAt)}` : null,
        `Source: ${input.sourceUrl}`,
        `Exported: ${formatDate(new Date())}`,
        "Export type: Smart",
      ]),
      sections: [
        {
          heading: "Overview",
          lines: [structured.overview],
        },
        {
          heading: "Key takeaways",
          lines: structured.keyTakeaways.map((line: string) => `- ${line}`),
        },
        {
          heading: "Highlights with evidence",
          lines: structured.highlights.flatMap((highlight: { timestamp: string; claim: string; evidence: string }) => [
            `- [${highlight.timestamp}] ${highlight.claim}`,
            `  ${highlight.evidence}`,
          ]),
        },
        ...(structured.surprisingOrContrarian.length > 0
          ? [{
              heading: "Surprising or contrarian points",
              lines: structured.surprisingOrContrarian.map((line: string) => `- ${line}`),
            }]
          : []),
        {
          heading: "Actionable next steps",
          lines: structured.actionItems.length > 0
            ? structured.actionItems.map((line: string) => `- ${line}`)
            : ["No explicit next steps were identified in the source material."],
        },
        {
          heading: "Transcript appendix",
          lines: input.transcriptLines.length > 0 ? input.transcriptLines : ["Transcript is not available for this item."],
        },
      ],
    },
    smartUsage: {
      modelId,
      inputTokens: result.totalUsage.inputTokens ?? 0,
      outputTokens: result.totalUsage.outputTokens ?? 0,
      totalTokens: result.totalUsage.totalTokens ?? ((result.totalUsage.inputTokens ?? 0) + (result.totalUsage.outputTokens ?? 0)),
      cachedInputTokens: 0,
    },
  };
}

export async function buildSmartChatExportDocument(input: SmartChatExportInput): Promise<BuiltExportDocument> {
  const startedAt = Date.now();

  const contextBlocks = [
    `Chat title: ${input.title}`,
    [
      "Research conversation (this is the primary signal — the user's questions reveal what they care about, and the assistant's answers contain the synthesized conclusions):",
      ...limitLines(input.conversationLines, MAX_CHAT_CONTEXT_LINES),
    ].join("\n"),
    input.sourceLines.length > 0
      ? ["Cited sources (use for attribution only, not as primary content):", ...input.sourceLines].join("\n")
      : "Cited sources: (none)",
  ];

  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
      model: getLanguageModel(SMART_EXPORT_MODEL_ALIAS),
      temperature: 0.2,
      maxOutputTokens: getModel(SMART_EXPORT_MODEL_ALIAS).maxOutputTokens,
      output: Output.object({
        name: "SmartChatExport",
        description: "Structured smart export sections for one chat session.",
        schema: smartChatExportSchema,
      }),
      system: [
        "You are distilling a user's research session into a brief they can use directly in their writing.",
        "Your audience are analysts and writers who publish on Substack, Ghost, or similar platforms.",
        "They used Distillr to ask specific research questions across their YouTube library. The chat is their research — your job is to distill it.",
        "",
        "Priority: the conversation IS the content. The user's questions reveal what matters to them. The assistant's answers contain the synthesized conclusions. Sources are for attribution, not the primary signal.",
        "",
        "Rules:",
        "- The overview should frame the research angle the user was pursuing, not summarize the sources.",
        "- Key conclusions should be the answers the user got to their questions — stated as specific, quotable findings.",
        "- For each source-backed finding, state the conclusion first, then attribute it to the specific video or channel.",
        "- Identify points that contradict conventional wisdom or present an unexpected angle. If none exist, return an empty array.",
        "- Bad: 'The chat explored marketing strategies.' Good: 'Across three channels, the consensus is that B2B short-form outperforms long-form by 3x on engagement — contradicting the common advice to go long for B2B.'",
        "- Recommended actions should reflect what the user should do next based on their specific research questions, not generic advice.",
        "- Use only conversation and source lines provided in the prompt.",
        "- Do not invent claims, citations, or conclusions not present in the input.",
        "- Do not include internal IDs, database metadata, or implementation details.",
        "- Do not include follow-up questions.",
        "- Keep the output concise and high-signal.",
      ].join("\n"),
      prompt: contextBlocks.join("\n\n"),
    });
  } catch (error) {
    const usage = NoObjectGeneratedError.isInstance(error) ? error.usage : undefined;

    await trackAIGeneration({
      userId: input.userId,
      operation: "smart_export_chat",
      modelAlias: SMART_EXPORT_MODEL_ALIAS,
      startedAtMs: startedAt,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      totalTokens: usage?.totalTokens,
      status: "failed",
    });

    throw error;
  }

  await trackAIGeneration({
    userId: input.userId,
    operation: "smart_export_chat",
    modelAlias: SMART_EXPORT_MODEL_ALIAS,
    startedAtMs: startedAt,
    inputTokens: result.totalUsage.inputTokens ?? 0,
    outputTokens: result.totalUsage.outputTokens ?? 0,
    totalTokens: result.totalUsage.totalTokens,
    status: "completed",
  });

  const structured = smartChatExportSchema.parse(result.output);
  const modelId = getModel(SMART_EXPORT_MODEL_ALIAS).modelId;

  return {
    document: {
      title: input.title,
      metadataLines: [
        `Library: ${input.libraryName}`,
        `Exported: ${formatDate(new Date())}`,
        "Export type: Smart",
      ],
      sections: [
        {
          heading: "Overview",
          lines: [structured.overview],
        },
        {
          heading: "Key conclusions",
          lines: structured.keyConclusions.map((line: string) => `- ${line}`),
        },
        {
          heading: "Source-backed findings",
          lines: structured.sourceBackedFindings.length > 0
            ? structured.sourceBackedFindings.flatMap((item: { finding: string; source: string }) => [
                `- ${item.finding}`,
                `  Source: ${item.source}`,
              ])
            : ["No explicit source-backed findings were captured in this session."],
        },
        ...(structured.surprisingOrContrarian.length > 0
          ? [{
              heading: "Surprising or contrarian points",
              lines: structured.surprisingOrContrarian.map((line: string) => `- ${line}`),
            }]
          : []),
        {
          heading: "Recommended actions",
          lines: structured.recommendedActions.length > 0
            ? structured.recommendedActions.map((line: string) => `- ${line}`)
            : ["No immediate action items were identified."],
        },
        {
          heading: "Conversation appendix",
          lines: input.conversationLines,
        },
      ],
    },
    smartUsage: {
      modelId,
      inputTokens: result.totalUsage.inputTokens ?? 0,
      outputTokens: result.totalUsage.outputTokens ?? 0,
      totalTokens: result.totalUsage.totalTokens ?? ((result.totalUsage.inputTokens ?? 0) + (result.totalUsage.outputTokens ?? 0)),
      cachedInputTokens: 0,
    },
  };
}

function limitLines(lines: string[], maxLines: number): string[] {
  return lines.slice(0, maxLines);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function compact(values: Array<string | null>): string[] {
  return values.filter((value): value is string => Boolean(value));
}
