import "server-only";

import * as Sentry from "@sentry/nextjs";
import { NonRetriableError } from "inngest";

import { classifyIngestionError } from "@/server/ingestion/errors";
import { getDiscovery } from "@/server/ingestion/providers/registry";
import { isSourceType, type IncrementalDiscoveryResult } from "@/server/ingestion/providers/types";
import { planAndQueueSourceItems, sendVideoIngestEvents } from "@/server/ingestion/source-planner";
import { inngest } from "@/server/inngest/client";
import { runIngestionStep } from "@/server/inngest/ingestion-step";
import { shouldStopRetrying } from "@/server/inngest/retry-policy";
import { getSourceForSync, updateSourceSyncState } from "@/server/sources/queries";

const AUTO_SYNC_INTERVAL_HOURS = 4;

export const sourceSync = inngest.createFunction(
  {
    id: "source-sync",
    retries: 3,
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
  },
  { event: "source.sync.requested" },
  async ({ event, step, attempt, maxAttempts }) => {
    const syncContext = {
      userId: event.data.userId,
      libraryId: event.data.libraryId,
      sourceId: event.data.sourceId,
      consecutiveSyncFailures: 0,
    };

    try {
      const source = await step.run("load-source", async () => {
        const row = await getSourceForSync(event.data.userId, event.data.libraryId, event.data.sourceId);

        if (!row) {
          throw new NonRetriableError("Source not found for source.sync.requested event.");
        }

        return row;
      });

      syncContext.userId = source.userId;
      syncContext.libraryId = source.libraryId;
      syncContext.sourceId = source.id;
      syncContext.consecutiveSyncFailures = source.consecutiveSyncFailures;

      if (!source.autoSyncEnabled) {
        return {
          sourceId: source.id,
          status: "skipped",
          reason: "auto_sync_disabled",
        };
      }

      if (!isSourceType(source.sourceType)) {
        throw new NonRetriableError(`Unsupported source type: ${source.sourceType}`);
      }

      if (source.sourceType === "youtube_video") {
        return {
          sourceId: source.id,
          status: "skipped",
          reason: "source_type_not_supported",
        };
      }

      if (source.status === "processing") {
        return {
          sourceId: source.id,
          status: "skipped",
          reason: "source_processing",
        };
      }

      if (source.nextSyncAt && new Date(source.nextSyncAt).getTime() > Date.now()) {
        return {
          sourceId: source.id,
          status: "skipped",
          reason: "not_due",
        };
      }

      const sourceType = source.sourceType;

      const discoveryResult = await runIngestionStep(step, "discover-incremental-items", async () => {
        const discovery = getDiscovery(sourceType);

        if (discovery.discoverIncremental) {
          return discovery.discoverIncremental({
            url: source.url,
            sourceType,
            cursor: source.syncCursor,
          });
        }

        const full = await discovery.discover(source.url, sourceType);

        const fallback: IncrementalDiscoveryResult = {
          ...full,
          nextCursor: source.syncCursor,
        };

        return fallback;
      });

      const queuePlan = await step.run("plan-source-queue", async () => {
        return planAndQueueSourceItems(source, discoveryResult.items);
      });

      await sendVideoIngestEvents(source, queuePlan.rowsToQueue, (batchId, events) => {
        return step.sendEvent(`enqueue-video-ingest-${batchId}`, events);
      });

      const now = new Date();
      const nextSyncAt = computeNextSyncAt(source.id, now);

      await step.run("update-sync-success", async () => {
        await updateSourceSyncState(source.userId, source.libraryId, source.id, {
          syncCursor: discoveryResult.nextCursor,
          nextSyncAt,
          lastCheckedAt: now,
          lastSyncedAt: now,
          lastSyncErrorAt: null,
          consecutiveSyncFailures: 0,
          channelName: discoveryResult.sourceAuthorName,
          title: discoveryResult.sourceTitle,
        });
      });

      return {
        sourceId: source.id,
        status: "synced",
        discovered: queuePlan.dedupedCount,
        queued: queuePlan.queuedCount,
        blocked: queuePlan.blockedCount,
      };
    } catch (error) {
      const decision = classifyIngestionError(error);
      const stopRetrying = shouldStopRetrying({
        retryable: decision.retryable,
        attempt,
        maxAttempts,
      });

      if (decision.captureException) {
        Sentry.captureException(error, {
          tags: {
            area: "source.sync",
          },
          extra: {
            userId: syncContext.userId,
            libraryId: syncContext.libraryId,
            sourceId: syncContext.sourceId,
            attempt,
            maxAttempts,
          },
        });
      }

      if (stopRetrying) {
        const now = new Date();
        const nextSyncAt = computeFailureRetryAt(
          syncContext.sourceId,
          syncContext.consecutiveSyncFailures + 1,
          now,
        );

        await step.run("update-sync-failure", async () => {
          await updateSourceSyncState(syncContext.userId, syncContext.libraryId, syncContext.sourceId, {
            lastCheckedAt: now,
            lastSyncErrorAt: now,
            consecutiveSyncFailures: syncContext.consecutiveSyncFailures + 1,
            nextSyncAt,
          });
        });

        return {
          sourceId: syncContext.sourceId,
          status: "failed",
          reason: decision.reason,
        };
      }

      throw error;
    }
  },
);

function computeNextSyncAt(sourceId: string, now: Date): Date {
  const baseMs = AUTO_SYNC_INTERVAL_HOURS * 60 * 60 * 1000;
  const jitterMs = getDeterministicJitterMs(sourceId, 30 * 60 * 1000);

  return new Date(now.getTime() + baseMs + jitterMs);
}

function computeFailureRetryAt(sourceId: string, failureCount: number, now: Date): Date {
  const boundedFailureCount = Math.max(1, Math.min(failureCount, 6));
  const backoffMinutes = Math.min(360, 15 * 2 ** (boundedFailureCount - 1));
  const jitterMs = getDeterministicJitterMs(sourceId, 10 * 60 * 1000);

  return new Date(now.getTime() + backoffMinutes * 60 * 1000 + jitterMs);
}

function getDeterministicJitterMs(value: string, maxJitterMs: number): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  const normalized = Math.abs(hash);
  return normalized % Math.max(1, maxJitterMs);
}
