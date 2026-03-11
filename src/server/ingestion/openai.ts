import "server-only";

import OpenAI from "openai";

import { captureServerEvent } from "@/server/core/analytics/posthog";
import { env } from "@/server/core/env";

const EMBEDDING_MODEL = "text-embedding-3-small";
const INSIGHTS_MODEL = "gpt-4.1-mini";

const EMBEDDING_PRICE_PER_MILLION_INPUT_TOKENS_USD = 0.02;
const GPT_4_1_MINI_PRICE_PER_MILLION_INPUT_TOKENS_USD = 0.4;
const GPT_4_1_MINI_PRICE_PER_MILLION_OUTPUT_TOKENS_USD = 1.6;

const EMBEDDING_BATCH_SIZE = 100;
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

let openaiClient: OpenAI | null = null;

export async function embedTexts(
  userId: string,
  inputs: string[],
  purpose: string,
): Promise<number[][]> {
  if (inputs.length === 0) {
    return [];
  }

  const embeddings: number[][] = [];

  for (let i = 0; i < inputs.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = inputs.slice(i, i + EMBEDDING_BATCH_SIZE);
    const startedAt = Date.now();

    const response = await getOpenAIClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    const latencyMs = Date.now() - startedAt;
    const inputTokens = response.usage.total_tokens ?? 0;

    await captureServerEvent(userId, "$ai_generation", {
      provider: "openai",
      model: EMBEDDING_MODEL,
      operation: purpose,
      tokens_in: inputTokens,
      tokens_out: 0,
      latency_ms: latencyMs,
      cost_usd: roundCost((inputTokens / 1_000_000) * EMBEDDING_PRICE_PER_MILLION_INPUT_TOKENS_USD),
    });

    for (const item of response.data) {
      embeddings.push(item.embedding);
    }
  }

  return embeddings;
}

export async function generateInsights(
  userId: string,
  videoTitle: string,
  transcript: string,
): Promise<GeneratedInsights> {
  const transcriptInput =
    transcript.length > MAX_INSIGHTS_TRANSCRIPT_CHARS
      ? transcript.slice(0, MAX_INSIGHTS_TRANSCRIPT_CHARS)
      : transcript;

  const startedAt = Date.now();
  const completion = await getOpenAIClient().chat.completions.create({
    model: INSIGHTS_MODEL,
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
        content: [
          `Video title: ${videoTitle}`,
          "Transcript:",
          transcriptInput,
        ].join("\n\n"),
      },
    ],
  });

  const latencyMs = Date.now() - startedAt;
  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;

  const estimatedCostUsd =
    (inputTokens / 1_000_000) * GPT_4_1_MINI_PRICE_PER_MILLION_INPUT_TOKENS_USD +
    (outputTokens / 1_000_000) * GPT_4_1_MINI_PRICE_PER_MILLION_OUTPUT_TOKENS_USD;

  await captureServerEvent(userId, "$ai_generation", {
    provider: "openai",
    model: INSIGHTS_MODEL,
    operation: "ingestion_insights",
    tokens_in: inputTokens,
    tokens_out: outputTokens,
    latency_ms: latencyMs,
    cost_usd: roundCost(estimatedCostUsd),
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

function getOpenAIClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

function roundCost(value: number): number {
  return Number(value.toFixed(8));
}
