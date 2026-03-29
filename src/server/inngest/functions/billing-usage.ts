import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, desc, eq, gte, inArray, isNotNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { chatMessages, contentItems, sourceContentItems } from "@/db/schema";
import {
  ingestChatCreditsUsage,
  ingestVideoUsage,
  type ChatUsageRecordPayload,
  type VideoUsageRecordPayload,
} from "@/server/billing/polar/usage";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { isAppError } from "@/server/core/errors/app-error";
import { inngest } from "@/server/inngest/client";
import { shouldStopRetrying } from "@/server/inngest/retry-policy";

const RECONCILIATION_LOOKBACK_HOURS = 48;
const RECONCILIATION_BATCH_SIZE = 300;
const RECONCILIATION_SEND_BATCH_SIZE = 300;
const RECONCILIATION_MAX_CHAT_RECORDS = 3000;
const RECONCILIATION_MAX_VIDEO_RECORDS = 3000;
const RECONCILIATION_TIME_BUDGET_MS = 25_000;
const BILLING_USAGE_CONCURRENCY_LIMIT = 5;

type ChatReconciliationRow = {
  userId: string;
  libraryId: string;
  sessionId: string;
  assistantMessageId: string;
  modelId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  createdAt: Date | string;
};

type VideoReconciliationRow = {
  userId: string;
  libraryId: string;
  sourceId: string;
  videoId: string;
  updatedAt: Date | string;
};

export const billingUsageChatRecord = inngest.createFunction(
  {
    id: "billing-usage-chat-record",
    retries: 6,
    concurrency: {
      limit: BILLING_USAGE_CONCURRENCY_LIMIT,
      key: "event.data.userId",
    },
  },
  { event: "billing.usage.chat.record" },
  async ({ event, attempt, maxAttempts }) => {
    try {
      await ingestChatCreditsUsage(event.data);

      return {
        status: "succeeded",
        assistantMessageId: event.data.assistantMessageId,
      };
    } catch (error) {
      const stopRetrying = shouldStopRetrying({
        retryable: isBillingRetryable(error),
        attempt,
        maxAttempts,
      });

      Sentry.captureException(error, {
        tags: {
          area: "billing.usage.chat.record",
        },
        extra: {
          userId: event.data.userId,
          assistantMessageId: event.data.assistantMessageId,
          attempt,
          maxAttempts,
          retryable: !stopRetrying,
        },
      });

      if (stopRetrying) {
        await captureServerEvent(event.data.userId, "billing_usage_terminal_failed", {
          usage_kind: "chat",
          assistant_message_id: event.data.assistantMessageId,
          attempt,
          max_attempts: maxAttempts,
        });

        return {
          status: "failed",
          assistantMessageId: event.data.assistantMessageId,
        };
      }

      throw error;
    }
  },
);

export const billingUsageVideoRecord = inngest.createFunction(
  {
    id: "billing-usage-video-record",
    retries: 6,
    concurrency: {
      limit: BILLING_USAGE_CONCURRENCY_LIMIT,
      key: "event.data.userId",
    },
  },
  { event: "billing.usage.video.record" },
  async ({ event, attempt, maxAttempts }) => {
    try {
      await ingestVideoUsage(event.data);

      return {
        status: "succeeded",
        videoId: event.data.videoId,
      };
    } catch (error) {
      const stopRetrying = shouldStopRetrying({
        retryable: isBillingRetryable(error),
        attempt,
        maxAttempts,
      });

      Sentry.captureException(error, {
        tags: {
          area: "billing.usage.video.record",
        },
        extra: {
          userId: event.data.userId,
          videoId: event.data.videoId,
          attempt,
          maxAttempts,
          retryable: !stopRetrying,
        },
      });

      if (stopRetrying) {
        await captureServerEvent(event.data.userId, "billing_usage_terminal_failed", {
          usage_kind: "video",
          video_id: event.data.videoId,
          attempt,
          max_attempts: maxAttempts,
        });

        return {
          status: "failed",
          videoId: event.data.videoId,
        };
      }

      throw error;
    }
  },
);

export const billingUsageReconcile = inngest.createFunction(
  {
    id: "billing-usage-reconcile",
    retries: 1,
  },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const since = new Date(Date.now() - RECONCILIATION_LOOKBACK_HOURS * 60 * 60 * 1000);
    const deadline = Date.now() + RECONCILIATION_TIME_BUDGET_MS;

    const chatRecords: ChatUsageRecordPayload[] = [];
    let chatCursor: { createdAtIso: string; id: string } | null = null;
    let chatBatchCount = 0;

    while (
      chatRecords.length < RECONCILIATION_MAX_CHAT_RECORDS &&
      Date.now() < deadline
    ) {
      const batchId = chatBatchCount;
      const cursor: { createdAtIso: string; id: string } | null = chatCursor;

      const rows: ChatReconciliationRow[] = await step.run(
        `load-chat-reconciliation-batch-${batchId}`,
        async (): Promise<ChatReconciliationRow[]> => {
        const baseWhere = and(
          eq(chatMessages.role, "assistant"),
          inArray(chatMessages.status, ["completed", "aborted"]),
          isNotNull(chatMessages.model),
          isNotNull(chatMessages.inputTokens),
          isNotNull(chatMessages.outputTokens),
          gte(chatMessages.createdAt, since),
        );

        const whereClause = cursor
          ? and(
              baseWhere,
              or(
                lt(chatMessages.createdAt, new Date(cursor.createdAtIso)),
                and(
                  eq(chatMessages.createdAt, new Date(cursor.createdAtIso)),
                  lt(chatMessages.id, cursor.id),
                ),
              ),
            )
          : baseWhere;

        return db
          .select({
            userId: chatMessages.userId,
            libraryId: chatMessages.libraryId,
            sessionId: chatMessages.sessionId,
            assistantMessageId: chatMessages.id,
            modelId: chatMessages.model,
            inputTokens: chatMessages.inputTokens,
            outputTokens: chatMessages.outputTokens,
            totalTokens: chatMessages.totalTokens,
            createdAt: chatMessages.createdAt,
          })
          .from(chatMessages)
          .where(whereClause)
          .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
          .limit(RECONCILIATION_BATCH_SIZE);
        },
      );

      if (rows.length === 0) {
        break;
      }

      chatBatchCount += 1;

      for (const row of rows) {
        if (
          !row.modelId ||
          row.inputTokens === null ||
          row.outputTokens === null
        ) {
          continue;
        }

        const totalTokens = row.totalTokens ?? row.inputTokens + row.outputTokens;
        if (totalTokens <= 0) {
          continue;
        }

        chatRecords.push({
          userId: row.userId,
          libraryId: row.libraryId,
          sessionId: row.sessionId,
          assistantMessageId: row.assistantMessageId,
          modelId: row.modelId,
          inputTokens: row.inputTokens,
          outputTokens: row.outputTokens,
          totalTokens,
          cachedInputTokens: undefined,
        });

        if (chatRecords.length >= RECONCILIATION_MAX_CHAT_RECORDS) {
          break;
        }
      }

      const lastRow: ChatReconciliationRow = rows[rows.length - 1];
      chatCursor = {
        createdAtIso: toIsoTimestamp(lastRow.createdAt),
        id: lastRow.assistantMessageId,
      };

      if (rows.length < RECONCILIATION_BATCH_SIZE) {
        break;
      }
    }

    const readyVideos: VideoUsageRecordPayload[] = [];
    let videoCursor: { updatedAtIso: string; id: string } | null = null;
    let videoBatchCount = 0;

    while (
      readyVideos.length < RECONCILIATION_MAX_VIDEO_RECORDS &&
      Date.now() < deadline
    ) {
      const batchId = videoBatchCount;
      const cursor: { updatedAtIso: string; id: string } | null = videoCursor;

      const rows: VideoReconciliationRow[] = await step.run(
        `load-video-reconciliation-batch-${batchId}`,
        async (): Promise<VideoReconciliationRow[]> => {
        const baseWhere = and(
          eq(contentItems.status, "ready"),
          gte(contentItems.updatedAt, since),
        );

        const whereClause = cursor
          ? and(
              baseWhere,
                or(
                  lt(contentItems.updatedAt, new Date(cursor.updatedAtIso)),
                  and(
                    eq(contentItems.updatedAt, new Date(cursor.updatedAtIso)),
                    lt(contentItems.id, cursor.id),
                  ),
                ),
              )
          : baseWhere;

        return db
          .select({
            userId: contentItems.userId,
            libraryId: contentItems.libraryId,
            sourceId: sql<string>`min(${sourceContentItems.sourceId}::text)`,
            videoId: contentItems.id,
            updatedAt: contentItems.updatedAt,
          })
          .from(contentItems)
          .innerJoin(sourceContentItems, eq(sourceContentItems.contentItemId, contentItems.id))
          .where(whereClause)
          .groupBy(
            contentItems.userId,
            contentItems.libraryId,
            contentItems.id,
            contentItems.updatedAt,
          )
          .orderBy(desc(contentItems.updatedAt), desc(contentItems.id))
          .limit(RECONCILIATION_BATCH_SIZE);
        },
      );

      if (rows.length === 0) {
        break;
      }

      videoBatchCount += 1;

      for (const row of rows) {
        readyVideos.push({
          userId: row.userId,
          libraryId: row.libraryId,
          sourceId: row.sourceId,
          videoId: row.videoId,
          units: 1,
        });

        if (readyVideos.length >= RECONCILIATION_MAX_VIDEO_RECORDS) {
          break;
        }
      }

      const lastRow: VideoReconciliationRow = rows[rows.length - 1];
      videoCursor = {
        updatedAtIso: toIsoTimestamp(lastRow.updatedAt),
        id: lastRow.videoId,
      };

      if (rows.length < RECONCILIATION_BATCH_SIZE) {
        break;
      }
    }

    const events = [
      ...chatRecords.map((row) => ({
        name: "billing.usage.chat.record" as const,
        data: row,
      })),
      ...readyVideos.map((row) => ({
        name: "billing.usage.video.record" as const,
        data: row,
      })),
    ];

    if (events.length === 0) {
      return {
        queued: 0,
        chatBatches: chatBatchCount,
        videoBatches: videoBatchCount,
      };
    }

    for (let i = 0; i < events.length; i += RECONCILIATION_SEND_BATCH_SIZE) {
      const batch = events.slice(i, i + RECONCILIATION_SEND_BATCH_SIZE);
      const batchId = i / RECONCILIATION_SEND_BATCH_SIZE;
      await step.sendEvent(`enqueue-reconciliation-events-${batchId}`, batch);
    }

    return {
      queued: events.length,
      chat: chatRecords.length,
      video: readyVideos.length,
      chatBatches: chatBatchCount,
      videoBatches: videoBatchCount,
    };
  },
);

function isBillingRetryable(error: unknown): boolean {
  if (isAppError(error)) {
    return error.retryable;
  }

  return true;
}

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
