import "server-only";

import { trackAIGeneration } from "@/server/core/analytics/ai-generation";
import { getOpenAIClient } from "@/server/core/openai/client";
import { getOpenAIModel } from "@/server/core/openai/models";

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
  const embeddingModel = getOpenAIModel("embedding.default");

  for (let i = 0; i < inputs.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = inputs.slice(i, i + EMBEDDING_BATCH_SIZE);
    const startedAt = Date.now();

    const response = await getOpenAIClient().embeddings.create({
      model: embeddingModel.id,
      input: batch,
    });

    const inputTokens = response.usage.total_tokens ?? 0;

    await trackAIGeneration({
      userId,
      operation: purpose,
      modelId: embeddingModel.id,
      modelAlias: "embedding.default",
      startedAtMs: startedAt,
      inputTokens,
      outputTokens: 0,
      totalTokens: inputTokens,
    });

    for (const item of response.data) {
      embeddings.push(item.embedding);
    }
  }

  return embeddings;
}
