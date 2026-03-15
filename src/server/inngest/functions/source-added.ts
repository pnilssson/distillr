import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { db } from "@/db";
import { sources, videos } from "@/db/schema";
import type { YouTubeSourceType } from "@/lib/validation/sources";
import { getPolarCustomerState } from "@/server/billing/polar/customers";
import { isPolarBillingEnabled } from "@/server/billing/polar/config";
import { buildBillingSnapshot } from "@/server/billing/polar/state";
import { classifyIngestionError } from "@/server/ingestion/errors";
import { discoverVideosFromSource } from "@/server/ingestion/youtube-discovery";
import { inngest } from "@/server/inngest/client";
import { runIngestionStep } from "@/server/inngest/ingestion-step";
import { shouldStopRetrying } from "@/server/inngest/retry-policy";

const VIDEO_DB_BATCH_SIZE = 100;
const VIDEO_EVENT_BATCH_SIZE = 100;

type VideoRow = {
  id: string;
  youtubeVideoId: string;
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

      const discoveryResult = await runIngestionStep(step, "discover-source-videos", async () => {
        return discoverVideosFromSource(source.url, source.sourceType as YouTubeSourceType);
      });

      const discoveredVideos = discoveryResult.videos;

      await step.run("update-source-metadata", async () => {
        await db
          .update(sources)
          .set({
            channelName: discoveryResult.sourceChannelName,
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

      if (discoveredVideos.length === 0) {
        await step.run("mark-source-ready-no-videos", async () => {
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

      const dedupedVideos = Array.from(
        new Map(discoveredVideos.map((video) => [video.youtubeVideoId, video])).values(),
      );

      const upsertedRows: VideoRow[] = [];

      for (let i = 0; i < dedupedVideos.length; i += VIDEO_DB_BATCH_SIZE) {
        const batch = dedupedVideos.slice(i, i + VIDEO_DB_BATCH_SIZE);
        const batchId = i / VIDEO_DB_BATCH_SIZE;

        const rows = await step.run(`upsert-videos-${batchId}`, async () => {
          return db
            .insert(videos)
            .values(
              batch.map((video) => ({
                userId: source.userId,
                libraryId: source.libraryId,
                sourceId: source.id,
                youtubeVideoId: video.youtubeVideoId,
                title: video.title,
                thumbnailUrl: video.thumbnailUrl,
                channelName: video.channelName,
                channelId: video.channelId,
                publishedAt: new Date(video.publishedAt),
                durationSeconds: video.durationSeconds,
              })),
            )
            .onConflictDoUpdate({
              target: [videos.libraryId, videos.youtubeVideoId],
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
              youtubeVideoId: videos.youtubeVideoId,
              status: videos.status,
            });
        });

        upsertedRows.push(...rows);
      }

      const rowsByYoutubeId = new Map(
        upsertedRows.map((row) => [row.youtubeVideoId, row] as const),
      );

      const queueCandidates = dedupedVideos
        .map((video) => rowsByYoutubeId.get(video.youtubeVideoId))
        .filter((row): row is VideoRow => Boolean(row))
        .filter((row) => row.status === "pending" || row.status === "failed");

      const allowance = await step.run("resolve-ingestion-allowance", async () => {
        return getIngestionAllowanceForUser(source.userId);
      });

      const allowedCount = Math.max(
        0,
        Math.min(
          queueCandidates.length,
          allowance.monthlyRemaining,
          allowance.lifetimeRemaining,
        ),
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
          batch.map((row) => ({
            name: "video.ingest" as const,
            data: {
              userId: source.userId,
              libraryId: source.libraryId,
              sourceId: source.id,
              videoId: row.id,
              youtubeVideoId: row.youtubeVideoId,
            },
          })),
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
        discovered: dedupedVideos.length,
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
