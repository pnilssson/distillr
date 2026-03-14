import "server-only";

import { trackAIGeneration } from "@/server/core/analytics/ai-generation";
import { getOpenAIClient } from "@/server/core/openai/client";
import { getOpenAIModel } from "@/server/core/openai/models";

export { embedTexts } from "@/server/core/openai/embeddings";

const MAX_INSIGHTS_TRANSCRIPT_CHARS = 120_000;

const INSIGHTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "key_points", "tactics", "objections", "tools"],
  properties: {
    summary: { type: "string" },
    key_points: {
      type: "array",
      items: { type: "string" },
    },
    tactics: {
      type: "array",
      items: { type: "string" },
    },
    objections: {
      type: "array",
      items: { type: "string" },
    },
    tools: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

type InsightOutput = {
  summary: string;
  key_points: string[];
  tactics: string[];
  objections: string[];
  tools: string[];
};

export type GeneratedInsights = {
  summary: string;
  keyPoints: string[];
  tactics: string[];
  objections: string[];
  tools: string[];
};

export async function generateInsights(
  userId: string,
  videoTitle: string,
  transcript: string,
): Promise<GeneratedInsights> {
  const ingestionModel = getOpenAIModel("ingestion.default");
  const transcriptInput =
    transcript.length > MAX_INSIGHTS_TRANSCRIPT_CHARS
      ? transcript.slice(0, MAX_INSIGHTS_TRANSCRIPT_CHARS)
      : transcript;

  const startedAt = Date.now();
  const completion = await getOpenAIClient().chat.completions.create({
    model: ingestionModel.id,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "video_ingestion_insights",
        strict: true,
        schema: INSIGHTS_SCHEMA,
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You extract structured insights from video transcripts. Return strict JSON with keys: summary (string), key_points (string[]), tactics (string[]), objections (string[]), tools (string[]). Keep items concise and factual.",
      },
      {
        role: "user",
        content: [`Video title: ${videoTitle}`, "Transcript:", transcriptInput].join("\n\n"),
      },
    ],
  });

  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;

  await trackAIGeneration({
    userId,
    operation: "ingestion_insights",
    modelId: ingestionModel.id,
    modelAlias: "ingestion.default",
    startedAtMs: startedAt,
    inputTokens,
    outputTokens,
    totalTokens: completion.usage?.total_tokens,
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = safelyParseInsights(content);

  return {
    summary: parsed.summary,
    keyPoints: parsed.key_points,
    tactics: parsed.tactics,
    objections: parsed.objections,
    tools: parsed.tools,
  };
}

function safelyParseInsights(raw: string): InsightOutput {
  try {
    const data = JSON.parse(raw) as Partial<InsightOutput>;

    return {
      summary: typeof data.summary === "string" ? data.summary.trim() : "",
      key_points: toStringArray(data.key_points),
      tactics: toStringArray(data.tactics),
      objections: toStringArray(data.objections),
      tools: toStringArray(data.tools),
    };
  } catch {
    return {
      summary: "",
      key_points: [],
      tactics: [],
      objections: [],
      tools: [],
    };
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}
