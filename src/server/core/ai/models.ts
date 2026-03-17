import "server-only";

import type { EmbeddingModel, LanguageModel } from "ai";

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
  | "chat.smart";

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
        modelId: env.OPENAI_MODEL_INGESTION ?? "gpt-5-mini",
        inputPricePerMillionUsd: 0.25,
        cachedInputPricePerMillionUsd: 0.03,
        outputPricePerMillionUsd: 2,
      },
      "chat.fast": {
        provider: "openai",
        modelId: env.OPENAI_MODEL_CHAT_FAST ?? "gpt-5-mini",
        inputPricePerMillionUsd: 0.25,
        cachedInputPricePerMillionUsd: 0.03,
        outputPricePerMillionUsd: 2,
        maxOutputTokens: env.OPENAI_CHAT_MAX_OUTPUT_TOKENS_FAST ?? 1200,
      },
      "chat.smart": {
        provider: "openai",
        modelId: env.OPENAI_MODEL_CHAT_SMART ?? "gpt-5.1",
        inputPricePerMillionUsd: 1.25,
        cachedInputPricePerMillionUsd: 0.13,
        outputPricePerMillionUsd: 10,
        maxOutputTokens: env.OPENAI_CHAT_MAX_OUTPUT_TOKENS_SMART ?? 1800,
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
export function getEmbeddingModel(alias: ModelAlias): EmbeddingModel<string> {
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
