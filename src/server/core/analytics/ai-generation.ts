import "server-only";

import { captureServerEvent } from "@/server/core/analytics/posthog";
import { calculateCostUsd, getModel, type ModelAlias } from "@/server/core/ai/models";

type TrackAIGenerationParams = {
  userId: string;
  operation: string;
  modelAlias: ModelAlias;
  startedAtMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  finishReason?: string;
  outputCapped?: boolean;
  status?: "completed" | "aborted" | "failed";
  libraryId?: string;
  sessionId?: string;
  messageId?: string;
  requestId?: string;
};

export async function trackAIGeneration(params: TrackAIGenerationParams): Promise<void> {
  const config = getModel(params.modelAlias);
  const totalTokens = params.totalTokens ?? params.inputTokens + params.outputTokens;
  const latencyMs = Date.now() - params.startedAtMs;
  const costUsd = calculateCostUsd(params.modelAlias, {
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cachedInputTokens: params.cachedInputTokens,
  });

  await captureServerEvent(params.userId, "$ai_generation", {
    provider: config.provider,
    model: config.modelId,
    model_id: config.modelId,
    model_alias: params.modelAlias,
    operation: params.operation,
    tokens_in: params.inputTokens,
    tokens_out: params.outputTokens,
    tokens_total: totalTokens,
    cached_input_tokens: params.cachedInputTokens ?? 0,
    latency_ms: latencyMs,
    cost_usd: costUsd,
    status: params.status ?? "completed",
    finish_reason: params.finishReason,
    output_capped: params.outputCapped ?? false,
    library_id: params.libraryId,
    session_id: params.sessionId,
    message_id: params.messageId,
    request_id: params.requestId,
  });
}
