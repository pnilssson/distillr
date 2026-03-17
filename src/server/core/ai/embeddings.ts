import "server-only";

import { embedMany } from "ai";

import { trackAIGeneration } from "@/server/core/analytics/ai-generation";
import { getEmbeddingModel } from "@/server/core/ai/models";

const EMBEDDING_BATCH_SIZE = 100;

export async function embedTexts(
  userId: string,
  inputs: string[],
  purpose: string,
): Promise<number[][]> {
  if (inputs.length === 0) {
    return [];
  }

  const embeddings: number[][] = [];
  const model = getEmbeddingModel("embedding.default");

  for (let i = 0; i < inputs.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = inputs.slice(i, i + EMBEDDING_BATCH_SIZE);
    const startedAt = Date.now();

    const result = await embedMany({ model, values: batch });
    const tokens = result.usage.tokens;

    await trackAIGeneration({
      userId,
      operation: purpose,
      modelAlias: "embedding.default",
      startedAtMs: startedAt,
      inputTokens: tokens,
      outputTokens: 0,
      totalTokens: tokens,
    });

    for (const embedding of result.embeddings) {
      embeddings.push(embedding);
    }
  }

  return embeddings;
}
