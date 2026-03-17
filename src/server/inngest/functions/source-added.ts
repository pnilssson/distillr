import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { db } from "@/db";
import { sources, videos } from "@/db/schema";
import { getPolarCustomerState } from "@/server/billing/polar/customers";
import { isPolarBillingEnabled } from "@/server/billing/polar/config";
import { buildBillingSnapshot } from "@/server/billing/polar/state";
import { classifyIngestionError } from "@/server/ingestion/errors";
import { getDiscovery } from "@/server/ingestion/providers/registry";
import { isContentType, isSourceType, type ContentType } from "@/server/ingestion/providers/types";
import { inngest } from "@/server/inngest/client";
import { runIngestionStep } from "@/server/inngest/ingestion-step";
import { shouldStopRetrying } from "@/server/inngest/retry-policy";

const VIDEO_DB_BATCH_SIZE = 100;
const VIDEO_EVENT_BATCH_SIZE = 100;

type VideoRow = {
  id: string;
  contentType: string;
  externalId: string;
  status: string;
};

type IngestionAllowance = {
  monthlyRemaining: number;
  lifetimeRemaining: number;
};

export const sourceAdded = inngest.createFunction(
  {
    id: "source-added",
    retries: 3,
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
  },
  { event: "source.added" },
  async ({ event, step, attempt, maxAttempts }) => {
    const failureContext = {
      userId: event.data.userId,
      libraryId: event.data.libraryId,
      sourceId: event.data.sourceId,
    };

    try {
      const source = await step.run("load-source", async () => {
        const [row] = await db
          .select({
            id: sources.id,
            userId: sources.userId,
            libraryId: sources.libraryId,
            sourceType: sources.sourceType,
            url: sources.url,
          })
          .from(sources)
          .where(
            and(
              eq(sources.id, event.data.sourceId),
              eq(sources.userId, event.data.userId),
              eq(sources.libraryId, event.data.libraryId),
            ),
          );

        if (!row) {
          throw new NonRetriableError("Source not found for source.added event.");
        }

        return row;
      });

      failureContext.userId = source.userId;
      failureContext.libraryId = source.libraryId;
      failureContext.sourceId = source.id;

      if (!isSourceType(source.sourceType)) {
        throw new NonRetriableError(`Unsupported source type: ${source.sourceType}`);
      }

      const sourceType = source.sourceType;

      await step.run("mark-source-processing", async () => {
        await db
          .update(sources)
          .set({
            status: "processing",
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(sources.id, source.id),
              eq(sources.userId, source.userId),
              eq(sources.libraryId, source.libraryId),
            ),
          );
      });

      const discoveryResult = await runIngestionStep(step, "discover-source-items", async () => {
        const discovery = getDiscovery(sourceType);
        return discovery.discover(source.url, sourceType);
      });

      const discoveredItems = discoveryResult.items;

      await step.run("update-source-metadata", async () => {
        await db
          .update(sources)
          .set({
            channelName: discoveryResult.sourceAuthorName,
            title: discoveryResult.sourceTitle,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(sources.id, source.id),
              eq(sources.userId, source.userId),
              eq(sources.libraryId, source.libraryId),
            ),
          );
      });

      if (discoveredItems.length === 0) {
        await step.run("mark-source-ready-no-items", async () => {
          await db
            .update(sources)
            .set({
              status: "ready",
              updatedAt: sql`now()`,
            })
            .where(
              and(
                eq(sources.id, source.id),
                eq(sources.userId, source.userId),
                eq(sources.libraryId, source.libraryId),
              ),
            );
        });

        return {
          sourceId: source.id,
          discovered: 0,
          queued: 0,
        };
      }

      const dedupedItems = Array.from(
        new Map(discoveredItems.map((item) => [`${item.contentType}:${item.externalId}`, item])).values(),
      );

      const upsertedRows: VideoRow[] = [];

      for (let i = 0; i < dedupedItems.length; i += VIDEO_DB_BATCH_SIZE) {
        const batch = dedupedItems.slice(i, i + VIDEO_DB_BATCH_SIZE);
        const batchId = i / VIDEO_DB_BATCH_SIZE;

        const rows = await step.run(`upsert-videos-${batchId}`, async () => {
          return db
            .insert(videos)
            .values(
              batch.map((item) => ({
                userId: source.userId,
                libraryId: source.libraryId,
                sourceId: source.id,
                externalId: item.externalId,
                contentType: item.contentType,
                title: item.title,
                thumbnailUrl: item.thumbnailUrl,
                channelName: item.authorName,
                channelId: item.authorId,
                publishedAt: new Date(item.publishedAt),
                durationSeconds: item.durationSeconds,
              })),
            )
            .onConflictDoUpdate({
              target: [videos.libraryId, videos.contentType, videos.externalId],
              set: {
                sourceId: sql`excluded.source_id`,
                title: sql`excluded.title`,
                thumbnailUrl: sql`excluded.thumbnail_url`,
                channelName: sql`excluded.channel_name`,
                channelId: sql`excluded.channel_id`,
                publishedAt: sql`excluded.published_at`,
                durationSeconds: sql`excluded.duration_seconds`,
                updatedAt: sql`now()`,
              },
            })
            .returning({
              id: videos.id,
              contentType: videos.contentType,
              externalId: videos.externalId,
              status: videos.status,
            });
        });

        upsertedRows.push(...rows);
      }

      const rowsByIdentity = new Map(
        upsertedRows.map((row) => [`${row.contentType}:${row.externalId}`, row] as const),
      );

      const queueCandidates = dedupedItems
        .map((item) => rowsByIdentity.get(`${item.contentType}:${item.externalId}`))
        .filter((row): row is VideoRow => Boolean(row))
        .filter((row) => row.status === "pending" || row.status === "failed");

      const allowance = await step.run("resolve-ingestion-allowance", async () => {
        return getIngestionAllowanceForUser(source.userId);
      });

      const allowedCount = Math.max(
        0,
        Math.min(queueCandidates.length, allowance.monthlyRemaining, allowance.lifetimeRemaining),
      );

      const rowsToQueue = queueCandidates.slice(0, allowedCount);
      const overflowRows = queueCandidates.slice(allowedCount);

      if (overflowRows.length > 0) {
        const overflowReason = getOverflowReason(allowance);

        await step.run("mark-overflow-videos-failed", async () => {
          await db
            .update(videos)
            .set({
              status: "failed",
              failureReason: overflowReason,
              updatedAt: sql`now()`,
            })
            .where(
              and(
                eq(videos.userId, source.userId),
                eq(videos.libraryId, source.libraryId),
                inArray(
                  videos.id,
                  overflowRows.map((row) => row.id),
                ),
              ),
            );
        });
      }

      for (let i = 0; i < rowsToQueue.length; i += VIDEO_EVENT_BATCH_SIZE) {
        const batch = rowsToQueue.slice(i, i + VIDEO_EVENT_BATCH_SIZE);
        const batchId = i / VIDEO_EVENT_BATCH_SIZE;

        await step.sendEvent(
          `enqueue-video-ingest-${batchId}`,
          batch.map((row) => {
            const contentType = normalizeContentTypeForEvent(row.contentType);

            return {
              name: "video.ingest" as const,
              data: {
                userId: source.userId,
                libraryId: source.libraryId,
                sourceId: source.id,
                videoId: row.id,
                contentType,
              },
            };
          }),
        );
      }

      await step.run("mark-source-ready", async () => {
        await db
          .update(sources)
          .set({
            status: "ready",
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(sources.id, source.id),
              eq(sources.userId, source.userId),
              eq(sources.libraryId, source.libraryId),
            ),
          );
      });

      return {
        sourceId: source.id,
        discovered: dedupedItems.length,
        queued: rowsToQueue.length,
        overflow: overflowRows.length,
      };
    } catch (error) {
      const decision = classifyIngestionError(error);
      const stopRetrying = shouldStopRetrying({
        retryable: decision.retryable,
        attempt,
        maxAttempts,
      });

      await step.run("mark-source-failed", async () => {
        await db
          .update(sources)
          .set({
            status: "failed",
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(sources.id, failureContext.sourceId),
              eq(sources.userId, failureContext.userId),
              eq(sources.libraryId, failureContext.libraryId),
            ),
          );
      });

      if (decision.captureException) {
        Sentry.captureException(error);
      }

      if (stopRetrying) {
        return {
          sourceId: failureContext.sourceId,
          status: "failed",
          reason: decision.reason,
        };
      }

      throw error;
    }
  },
);

async function getIngestionAllowanceForUser(userId: string): Promise<IngestionAllowance> {
  if (!isPolarBillingEnabled()) {
    return {
      monthlyRemaining: Number.POSITIVE_INFINITY,
      lifetimeRemaining: Number.POSITIVE_INFINITY,
    };
  }

  const state = await getPolarCustomerState(userId);

  if (!state) {
    throw new Error("Could not verify video ingestion limits right now.");
  }

  const billing = buildBillingSnapshot(state);

  return {
    monthlyRemaining: billing.monthlyVideoBalance,
    lifetimeRemaining: billing.lifetimeVideoRemaining,
  };
}

function getOverflowReason(allowance: IngestionAllowance): string {
  if (allowance.monthlyRemaining <= 0) {
    return "You have reached your monthly video ingestion limit.";
  }

  if (allowance.lifetimeRemaining <= 0) {
    return "You have reached your total video limit for this plan.";
  }

  return "You have reached your video ingestion limit for this plan.";
}

function normalizeContentTypeForEvent(contentType: string): ContentType {
  if (isContentType(contentType)) {
    return contentType;
  }

  throw new NonRetriableError(`Unsupported content type: ${contentType}`);
}
