import "server-only";

import { AppError } from "@/server/core/errors/app-error";
import {
  getCreditsPerUsd,
  isPolarBillingEnabled,
} from "@/server/billing/polar/config";
import { ingestPolarEvent } from "@/server/billing/polar/client";
import { calculateOpenAICostUsd } from "@/server/core/openai/models";
import { env } from "@/server/core/env";

export type ChatUsageRecordPayload = {
  userId: string;
  libraryId: string;
  sessionId: string;
  assistantMessageId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
  cachedInputTokens?: number;
};

export type VideoUsageRecordPayload = {
  userId: string;
  libraryId: string;
  sourceId: string;
  videoId: string;
  units?: number;
};

export async function ingestChatCreditsUsage(input: ChatUsageRecordPayload): Promise<number> {
  if (!isPolarBillingEnabled()) {
    return 0;
  }

  const eventName = env.POLAR_EVENT_NAME_CHAT_CREDITS_CONSUMED;
  if (!eventName) {
    throw new AppError({
      code: "BILLING_CHAT_EVENT_NOT_CONFIGURED",
      userMessage: "Could not sync usage right now.",
      httpStatus: 503,
      retryable: false,
    });
  }

  const totalTokens = input.totalTokens ?? input.inputTokens + input.outputTokens;
  if (totalTokens <= 0) {
    return 0;
  }

  const costUsd = calculateOpenAICostUsd({
    modelId: input.modelId,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    cachedInputTokens: input.cachedInputTokens,
  });
  const creditsUsed = convertCostUsdToCredits(costUsd);
  const externalId = getChatUsageExternalId(input.assistantMessageId);

  await ingestPolarEvent(
    {
      name: eventName,
      externalCustomerId: input.userId,
      externalId,
      metadata: {
        credits_used: creditsUsed,
        cost_usd: costUsd,
        input_tokens: input.inputTokens,
        output_tokens: input.outputTokens,
        total_tokens: totalTokens,
        model_id: input.modelId,
        library_id: input.libraryId,
        session_id: input.sessionId,
        message_id: input.assistantMessageId,
      },
    },
    {
      idempotencyKey: externalId,
    },
  );

  return creditsUsed;
}

export async function ingestVideoUsage(input: VideoUsageRecordPayload): Promise<void> {
  if (!isPolarBillingEnabled()) {
    return;
  }

  const eventName = env.POLAR_EVENT_NAME_VIDEO_INGESTED;
  if (!eventName) {
    throw new AppError({
      code: "BILLING_VIDEO_EVENT_NOT_CONFIGURED",
      userMessage: "Could not sync usage right now.",
      httpStatus: 503,
      retryable: false,
    });
  }

  const units = Math.max(1, Math.floor(input.units ?? 1));
  const externalId = getVideoUsageExternalId(input.videoId);

  await ingestPolarEvent(
    {
      name: eventName,
      externalCustomerId: input.userId,
      externalId,
      metadata: {
        units,
        library_id: input.libraryId,
        source_id: input.sourceId,
        video_id: input.videoId,
      },
    },
    {
      idempotencyKey: externalId,
    },
  );
}

export function convertCostUsdToCredits(costUsd: number): number {
  const creditsPerUsd = getCreditsPerUsd();

  if (!Number.isFinite(costUsd) || costUsd <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(costUsd * creditsPerUsd));
}

export function getChatUsageExternalId(assistantMessageId: string): string {
  return `distillr-chat-${assistantMessageId}`;
}

export function getVideoUsageExternalId(videoId: string): string {
  return `distillr-video-${videoId}`;
}
