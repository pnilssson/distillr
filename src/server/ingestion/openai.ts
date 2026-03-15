import "server-only";

import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";

import { trackAIGeneration } from "@/server/core/analytics/ai-generation";
import { getOpenAIModel } from "@/server/core/openai/models";

export { embedTexts } from "@/server/core/openai/embeddings";

const MAX_INSIGHTS_TRANSCRIPT_CHARS = 120_000;

const insightsOutputSchema = z
  .object({
    summary: z.string(),
    key_points: z.array(z.string()),
    tactics: z.array(z.string()),
    objections: z.array(z.string()),
    tools: z.array(z.string()),
  })
  .strict();

type InsightOutput = z.infer<typeof insightsOutputSchema>;

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
  const result = await generateText({
    model: openai(ingestionModel.id),
    temperature: 0.2,
    output: Output.object({
      name: "VideoIngestionInsights",
      description: "Structured extraction of key insights from a video transcript.",
      schema: insightsOutputSchema,
    }),
    system:
      "Extract structured insights from the provided video transcript. Keep the summary and list items concise, factual, and grounded in transcript content.",
    prompt: [`Video title: ${videoTitle}`, "Transcript:", transcriptInput].join("\n\n"),
  });

  const inputTokens = result.totalUsage.inputTokens ?? 0;
  const outputTokens = result.totalUsage.outputTokens ?? 0;

  await trackAIGeneration({
    userId,
    operation: "ingestion_insights",
    modelId: ingestionModel.id,
    modelAlias: "ingestion.default",
    startedAtMs: startedAt,
    inputTokens,
    outputTokens,
    totalTokens: result.totalUsage.totalTokens,
  });

  const parsed: InsightOutput = {
    summary: result.output.summary.trim(),
    key_points: cleanStringArray(result.output.key_points),
    tactics: cleanStringArray(result.output.tactics),
    objections: cleanStringArray(result.output.objections),
    tools: cleanStringArray(result.output.tools),
  };

  return {
    summary: parsed.summary,
    keyPoints: parsed.key_points,
    tactics: parsed.tactics,
    objections: parsed.objections,
    tools: parsed.tools,
  };
}

function cleanStringArray(value: string[]): string[] {
  return value
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
