import "server-only";

import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

import type { ExportDocument } from "@/server/exports/types";
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
      title: z.string().trim().min(1),
      summary: z.string().trim().min(1),
    }),
  ).min(3).max(8),
  actionItems: z.array(z.string().trim().min(1)).max(8),
}).strict();

const smartChatExportSchema = z.object({
  overview: z.string().trim().min(1),
  keyConclusions: z.array(z.string().trim().min(1)).min(3).max(8),
  sourceBackedPoints: z.array(z.string().trim().min(1)).max(8),
  recommendedActions: z.array(z.string().trim().min(1)).max(8),
}).strict();

const MAX_TRANSCRIPT_CONTEXT_LINES = 180;
const MAX_CHAT_CONTEXT_LINES = 180;

export async function buildSmartVideoExportDocument(input: SmartVideoExportInput): Promise<ExportDocument> {
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
        "You are writing a smart export for Distillr users.",
        "Return concise, high-signal sections based only on the supplied source material.",
        "Do not invent facts, quotes, timestamps, or claims beyond the input.",
        "Do not include internal system metadata or implementation details.",
        "Keep each bullet actionable and specific.",
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

  return {
    title: input.title,
    metadataLines: compact([
      input.channelName ? `Channel: ${input.channelName}` : null,
      input.publishedAt ? `Published: ${formatDate(input.publishedAt)}` : null,
      `Source: ${input.sourceUrl}`,
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
        heading: "Timestamped highlights",
        lines: structured.highlights.flatMap((highlight: { timestamp: string; title: string; summary: string }) => [
          `- [${highlight.timestamp}] ${highlight.title}`,
          `  ${highlight.summary}`,
        ]),
      },
      {
        heading: "Actionable next steps",
        lines: structured.actionItems.length > 0
          ? structured.actionItems.map((line: string) => `- ${line}`)
          : ["- No explicit next steps were identified in the source material."],
      },
      {
        heading: "Transcript appendix",
        lines: input.transcriptLines.length > 0 ? input.transcriptLines : ["Transcript is not available for this item."],
      },
    ],
  };
}

export async function buildSmartChatExportDocument(input: SmartChatExportInput): Promise<ExportDocument> {
  const startedAt = Date.now();

  const contextBlocks = [
    `Chat title: ${input.title}`,
    [
      "Conversation excerpts:",
      ...limitLines(input.conversationLines, MAX_CHAT_CONTEXT_LINES),
    ].join("\n"),
    input.sourceLines.length > 0
      ? ["Cited source lines:", ...input.sourceLines].join("\n")
      : "Cited source lines: (none)",
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
        "You are writing a smart chat export for Distillr users.",
        "Use only conversation and source lines provided in the prompt.",
        "Do not invent claims, citations, or conclusions not present in the input.",
        "Do not include internal IDs, database metadata, or implementation details.",
        "Do not include follow-up questions.",
        "Return practical recommended actions as statements, not questions.",
        "Keep the output concise and practical.",
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

  return {
    title: input.title,
    metadataLines: ["Export type: Smart"],
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
        heading: "Source-backed points",
        lines: structured.sourceBackedPoints.length > 0
          ? structured.sourceBackedPoints.map((line: string) => `- ${line}`)
          : ["- No explicit source-backed points were captured in this session."],
      },
      {
        heading: "Recommended actions",
        lines: structured.recommendedActions.length > 0
          ? structured.recommendedActions.map((line: string) => `- ${line}`)
          : ["- No immediate action items were identified."],
      },
      {
        heading: "Conversation appendix",
        lines: input.conversationLines,
      },
    ],
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
