import "server-only";

import type { LanguageModel } from "ai";

import { env } from "@/server/core/env";
import { getOpenAIProvider } from "@/server/core/ai/providers";

/**
 * Supported AI providers. Extend this union when adding a new provider.
 * Then add a case to getLanguageModel() and getEmbeddingModel() in this file,
 * and a factory function in providers.ts.
 */
export type AIProvider = "openai";

/**
 * Internal aliases that identify each AI role. Values here are the single
 * source of truth — add a new alias to expand model support.
 */
export type ModelAlias =
  | "embedding.default"
  | "ingestion.default"
  | "chat.fast"
  | "chat.smart"
  | "chat.pro";

type AIModelConfig = {
  provider: AIProvider;
  modelId: string;
  inputPricePerMillionUsd: number;
  cachedInputPricePerMillionUsd: number;
  outputPricePerMillionUsd: number;
  /** Only relevant for generative (non-embedding) models. */
  maxOutputTokens?: number;
};

let catalog: Record<ModelAlias, AIModelConfig> | null = null;

function getModelCatalog(): Record<ModelAlias, AIModelConfig> {
  if (!catalog) {
    catalog = {
      "embedding.default": {
        provider: "openai",
        modelId: env.OPENAI_MODEL_EMBEDDING ?? "text-embedding-3-small",
        inputPricePerMillionUsd: 0.02,
        cachedInputPricePerMillionUsd: 0,
        outputPricePerMillionUsd: 0,
      },
      "ingestion.default": {
        provider: "openai",
        modelId: env.OPENAI_MODEL_INGESTION ?? "gpt-5.4-mini",
        inputPricePerMillionUsd: 0.75,
        cachedInputPricePerMillionUsd: 0.08,
        outputPricePerMillionUsd: 4.5,
      },
      "chat.fast": {
        provider: "openai",
        modelId: env.OPENAI_MODEL_CHAT_FAST ?? "gpt-5.4-nano",
        inputPricePerMillionUsd: 0.2,
        cachedInputPricePerMillionUsd: 0.02,
        outputPricePerMillionUsd: 1.25,
        maxOutputTokens: env.OPENAI_CHAT_MAX_OUTPUT_TOKENS_FAST ?? 1200,
      },
      "chat.smart": {
        provider: "openai",
        modelId: env.OPENAI_MODEL_CHAT_SMART ?? "gpt-5.4-mini",
        inputPricePerMillionUsd: 0.75,
        cachedInputPricePerMillionUsd: 0.08,
        outputPricePerMillionUsd: 4.5,
        maxOutputTokens: env.OPENAI_CHAT_MAX_OUTPUT_TOKENS_SMART ?? 1800,
      },
      "chat.pro": {
        provider: "openai",
        modelId: env.OPENAI_MODEL_CHAT_PRO ?? "gpt-5.4",
        inputPricePerMillionUsd: 2.5,
        cachedInputPricePerMillionUsd: 0.25,
        outputPricePerMillionUsd: 15,
        maxOutputTokens: env.OPENAI_CHAT_MAX_OUTPUT_TOKENS_PRO ?? 2400,
      },
    };
  }

  return catalog;
}

export function getModel(alias: ModelAlias): AIModelConfig {
  return getModelCatalog()[alias];
}

/** Returns the Vercel AI SDK LanguageModel for the given alias. */
export function getLanguageModel(alias: ModelAlias): LanguageModel {
  const config = getModel(alias);

  switch (config.provider) {
    case "openai":
      return getOpenAIProvider()(config.modelId);
  }
}

/** Returns the Vercel AI SDK EmbeddingModel for the given alias. */
export function getEmbeddingModel(alias: ModelAlias) {
  const config = getModel(alias);

  switch (config.provider) {
    case "openai":
      return getOpenAIProvider().embedding(config.modelId);
  }
}

/**
 * Calculates cost in USD for a call using a known model alias.
 * Use this when the alias is available (most paths).
 */
export function calculateCostUsd(
  alias: ModelAlias,
  params: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  },
): number {
  const config = getModel(alias);

  return computeCost(config, params);
}

/**
 * Calculates cost in USD for a call identified by raw model ID.
 * Use this for reconciliation paths where only the stored model ID is available.
 * Scans the catalog for the first alias whose resolved model ID matches.
 */
export function calculateCostUsdByModelId(
  modelId: string,
  params: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  },
): number {
  const catalog = getModelCatalog();
  const config = Object.values(catalog).find((c) => c.modelId === modelId);

  if (!config) {
    throw new Error(`No pricing config found for model ID: ${modelId}`);
  }

  return computeCost(config, params);
}

function computeCost(
  config: AIModelConfig,
  params: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  },
): number {
  const cachedInputTokens = Math.max(params.cachedInputTokens ?? 0, 0);
  const uncachedInputTokens = Math.max(params.inputTokens - cachedInputTokens, 0);

  const costUsd =
    (uncachedInputTokens / 1_000_000) * config.inputPricePerMillionUsd +
    (cachedInputTokens / 1_000_000) * config.cachedInputPricePerMillionUsd +
    (params.outputTokens / 1_000_000) * config.outputPricePerMillionUsd;

  return roundCostUsd(costUsd);
}

export function roundCostUsd(value: number): number {
  return Number(value.toFixed(8));
}
