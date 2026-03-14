import "server-only";

import { env } from "@/server/core/env";

export type ChatModelTier = "fast" | "smart";
export type OpenAIModelAlias = "embedding.default" | "ingestion.default" | "chat.fast" | "chat.smart";

export type OpenAIModelId = "text-embedding-3-small" | "gpt-5-mini" | "gpt-5.1";

type OpenAIModelConfig = {
  id: OpenAIModelId;
  inputPricePerMillionUsd: number;
  cachedInputPricePerMillionUsd: number;
  outputPricePerMillionUsd: number;
};

const OPENAI_MODEL_CATALOG: Record<OpenAIModelId, OpenAIModelConfig> = {
  "text-embedding-3-small": {
    id: "text-embedding-3-small",
    inputPricePerMillionUsd: 0.02,
    cachedInputPricePerMillionUsd: 0,
    outputPricePerMillionUsd: 0,
  },
  "gpt-5-mini": {
    id: "gpt-5-mini",
    inputPricePerMillionUsd: 0.25,
    cachedInputPricePerMillionUsd: 0.025,
    outputPricePerMillionUsd: 2,
  },
  "gpt-5.1": {
    id: "gpt-5.1",
    inputPricePerMillionUsd: 1.25,
    cachedInputPricePerMillionUsd: 0.125,
    outputPricePerMillionUsd: 10,
  },
};

const DEFAULT_MODELS: Record<OpenAIModelAlias, OpenAIModelId> = {
  "embedding.default": "text-embedding-3-small",
  "ingestion.default": "gpt-5-mini",
  "chat.fast": "gpt-5-mini",
  "chat.smart": "gpt-5.1",
};

export function getOpenAIModel(alias: OpenAIModelAlias): OpenAIModelConfig {
  const configuredId = getConfiguredModelId(alias);
  return getOpenAIModelById(configuredId);
}

export function getOpenAIModelById(modelId: string): OpenAIModelConfig {
  const model = OPENAI_MODEL_CATALOG[modelId as OpenAIModelId];

  if (!model) {
    throw new Error(`Unsupported OpenAI model configured: ${modelId}`);
  }

  return model;
}

export function getDefaultChatModel(): OpenAIModelConfig {
  return getOpenAIModel(getDefaultChatModelAlias());
}

export function getDefaultChatModelAlias(): OpenAIModelAlias {
  const tier = env.OPENAI_CHAT_DEFAULT_TIER ?? "smart";
  return tier === "fast" ? "chat.fast" : "chat.smart";
}

export function calculateOpenAICostUsd(params: {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}): number {
  const model = getOpenAIModelById(params.modelId);
  const cachedInputTokens = Math.max(params.cachedInputTokens ?? 0, 0);
  const uncachedInputTokens = Math.max(params.inputTokens - cachedInputTokens, 0);

  const costUsd =
    (uncachedInputTokens / 1_000_000) * model.inputPricePerMillionUsd +
    (cachedInputTokens / 1_000_000) * model.cachedInputPricePerMillionUsd +
    (params.outputTokens / 1_000_000) * model.outputPricePerMillionUsd;

  return roundCostUsd(costUsd);
}

export function roundCostUsd(value: number): number {
  return Number(value.toFixed(8));
}

function getConfiguredModelId(alias: OpenAIModelAlias): OpenAIModelId {
  const override =
    alias === "embedding.default"
      ? env.OPENAI_MODEL_EMBEDDING
      : alias === "ingestion.default"
        ? env.OPENAI_MODEL_INGESTION
        : alias === "chat.fast"
          ? env.OPENAI_MODEL_CHAT_FAST
          : env.OPENAI_MODEL_CHAT_SMART;

  const modelId = (override ?? DEFAULT_MODELS[alias]) as OpenAIModelId;
  getOpenAIModelById(modelId);
  return modelId;
}
