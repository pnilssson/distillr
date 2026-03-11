import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, eq, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { db } from "@/db";
import { sources, videos } from "@/db/schema";
import type { YouTubeSourceType } from "@/lib/validation/sources";
import { discoverVideosFromSource } from "@/server/ingestion/youtube-discovery";
import { inngest } from "@/server/inngest/client";

const VIDEO_DB_BATCH_SIZE = 100;
const VIDEO_EVENT_BATCH_SIZE = 100;

type VideoRow = {
  id: string;
  youtubeVideoId: string;
  status: string;
};

export const sourceAdded = inngest.createFunction(
  { id: "source-added" },
  { event: "source.added" },
  async ({ event, step }) => {
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

      const discoveredVideos = await step.run("discover-source-videos", async () => {
        return discoverVideosFromSource(source.url, source.sourceType as YouTubeSourceType);
      });

      if (discoveredVideos.length === 0) {
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

      const rowsToQueue = upsertedRows.filter(
        (row) => row.status === "pending" || row.status === "failed",
      );

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

      return {
        sourceId: source.id,
        discovered: dedupedVideos.length,
        queued: rowsToQueue.length,
      };
    } catch (error) {
      if (!(error instanceof NonRetriableError)) {
        Sentry.captureException(error);
      }

      throw error;
    }
  },
);
