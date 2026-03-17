import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { db } from "@/db";
import { contentChunkAnchors, contentChunks, contentInsights, contentItems } from "@/db/schema";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { chunkContentSegments } from "@/server/ingestion/chunking";
import { classifyIngestionError } from "@/server/ingestion/errors";
import { embedTexts, generateInsights } from "@/server/ingestion/ai";
import { getFetcher } from "@/server/ingestion/providers/registry";
import { IngestionError, isContentType } from "@/server/ingestion/providers/types";
import { inngest } from "@/server/inngest/client";
import { runIngestionStep } from "@/server/inngest/ingestion-step";
import { shouldStopRetrying } from "@/server/inngest/retry-policy";

const DB_BATCH_SIZE = 100;

type InsightRecord = {
  insightType: string;
  content: string;
};

export const videoIngest = inngest.createFunction(
  {
    id: "video-ingest",
    retries: 3,
    concurrency: {
      limit: 5,
      key: "event.data.userId",
    },
  },
  { event: "video.ingest" },
  async ({ event, step, attempt, maxAttempts }) => {
    const failureContext = {
      userId: event.data.userId,
      libraryId: event.data.libraryId,
      videoId: event.data.videoId,
      sourceId: event.data.sourceId,
    };

    try {
      const video = await step.run("load-video", async () => {
        const [row] = await db
          .select({
            id: contentItems.id,
            userId: contentItems.userId,
            libraryId: contentItems.libraryId,
            externalId: contentItems.externalId,
            contentType: contentItems.contentType,
            title: contentItems.title,
          })
          .from(contentItems)
          .where(
            and(
              eq(contentItems.id, event.data.videoId),
              eq(contentItems.userId, event.data.userId),
              eq(contentItems.libraryId, event.data.libraryId),
            ),
          );

        if (!row) {
          throw new NonRetriableError("Video not found for video.ingest event.");
        }

        return row;
      });

      failureContext.userId = video.userId;
      failureContext.libraryId = video.libraryId;
      failureContext.videoId = video.id;

      if (!isContentType(video.contentType)) {
        throw new NonRetriableError(`Unsupported content type: ${video.contentType}`);
      }

      const contentType = video.contentType;

      await step.run("mark-processing", async () => {
        await db
          .update(contentItems)
          .set({
            status: "processing",
            failureReason: null,
            updatedAt: sql`now()`,
          })
          .where(eq(contentItems.id, video.id));
      });

      const content = await runIngestionStep(step, "fetch-content", async () => {
        const fetcher = getFetcher(contentType);
        return fetcher.fetch(video.externalId);
      });

      const contentText = content.segments.map((segment) => segment.text).join(" ");

      const chunkingResult = await step.run("chunk-content", async () => {
        return chunkContentSegments(content.segments);
      });

      if (chunkingResult.chunks.length === 0) {
        throw new IngestionError("Content produced zero chunks.", true);
      }

      const chunkEmbeddings = await step.run("embed-chunks", async () => {
        return embedTexts(
          video.userId,
          chunkingResult.chunks.map((chunk) => chunk.chunkText),
          "ingestion_chunk_embeddings",
        );
      });

      await step.run("upsert-video-chunks", async () => {
        for (let i = 0; i < chunkingResult.chunks.length; i += DB_BATCH_SIZE) {
          const chunkBatch = chunkingResult.chunks.slice(i, i + DB_BATCH_SIZE);
          const embeddingBatch = chunkEmbeddings.slice(i, i + DB_BATCH_SIZE);

          const values = chunkBatch.map((chunk, index) => {
            const embedding = embeddingBatch[index];
            if (!embedding) {
              throw new Error("Chunk embedding count does not match chunk count.");
            }

            return {
              userId: video.userId,
              libraryId: video.libraryId,
              contentItemId: video.id,
              chunkIndex: chunk.chunkIndex,
              chunkText: chunk.chunkText,
              itemTitle: video.title,
              startSeconds: chunk.startSeconds,
              endSeconds: chunk.endSeconds,
              embedding,
            };
          });

          await db
            .insert(contentChunks)
            .values(values)
            .onConflictDoUpdate({
              target: [contentChunks.contentItemId, contentChunks.chunkIndex],
              set: {
                chunkText: sql`excluded.chunk_text`,
                itemTitle: sql`excluded.item_title`,
                startSeconds: sql`excluded.start_seconds`,
                endSeconds: sql`excluded.end_seconds`,
                embedding: sql`excluded.embedding`,
                updatedAt: sql`now()`,
              },
            });
        }

        await db
          .delete(contentChunks)
          .where(
            and(
              eq(contentChunks.contentItemId, video.id),
              gte(contentChunks.chunkIndex, chunkingResult.chunks.length),
            ),
          );
      });

      await step.run("upsert-chunk-anchors", async () => {
        const chunkIndexes = chunkingResult.chunks.map((chunk) => chunk.chunkIndex);

        const persistedChunks = await db
          .select({
            id: contentChunks.id,
            chunkIndex: contentChunks.chunkIndex,
          })
          .from(contentChunks)
          .where(
            and(
              eq(contentChunks.contentItemId, video.id),
              inArray(contentChunks.chunkIndex, chunkIndexes),
            ),
          );

        const chunkIdByIndex = new Map(
          persistedChunks.map((chunk) => [chunk.chunkIndex, chunk.id] as const),
        );

        const desiredAnchorsByChunkId = new Map<
          string,
          Array<{
            anchorKey: string;
            anchorType: "timecode" | "page" | "section" | "char_range";
            startValue: number | null;
            endValue: number | null;
            label: string | null;
            urlFragment: string | null;
            metadata: Record<string, unknown> | null;
          }>
        >();

        const anchorValues = chunkingResult.chunks.flatMap((chunk) => {
          const chunkId = chunkIdByIndex.get(chunk.chunkIndex);
          if (!chunkId) {
            return [];
          }

          desiredAnchorsByChunkId.set(chunkId, chunk.anchors);

          if (chunk.anchors.length === 0) {
            return [];
          }

          return chunk.anchors.map((anchor) => ({
            userId: video.userId,
            libraryId: video.libraryId,
            contentItemId: video.id,
            contentChunkId: chunkId,
            anchorKey: anchor.anchorKey,
            anchorType: anchor.anchorType,
            startValue: anchor.startValue,
            endValue: anchor.endValue,
            label: anchor.label,
            urlFragment: anchor.urlFragment,
            metadata: anchor.metadata,
          }));
        });

        for (let i = 0; i < anchorValues.length; i += DB_BATCH_SIZE) {
          const batch = anchorValues.slice(i, i + DB_BATCH_SIZE);

          await db
            .insert(contentChunkAnchors)
            .values(batch)
            .onConflictDoUpdate({
              target: [contentChunkAnchors.contentChunkId, contentChunkAnchors.anchorKey],
              set: {
                anchorType: sql`excluded.anchor_type`,
                startValue: sql`excluded.start_value`,
                endValue: sql`excluded.end_value`,
                label: sql`excluded.label`,
                urlFragment: sql`excluded.url_fragment`,
                metadata: sql`excluded.metadata`,
                updatedAt: sql`now()`,
              },
            });
        }

        for (const [chunkId, anchors] of desiredAnchorsByChunkId.entries()) {
          if (anchors.length === 0) {
            await db
              .delete(contentChunkAnchors)
              .where(eq(contentChunkAnchors.contentChunkId, chunkId));
            continue;
          }

          await db
            .delete(contentChunkAnchors)
            .where(
              and(
                eq(contentChunkAnchors.contentChunkId, chunkId),
                notInArray(
                  contentChunkAnchors.anchorKey,
                  anchors.map((anchor) => anchor.anchorKey),
                ),
              ),
            );
        }
      });

      const insights = await step.run("generate-insights", async () => {
        return generateInsights(video.userId, video.title, contentText);
      });

      const insightRecords: InsightRecord[] = [
        { insightType: "summary", content: insights.summary },
        { insightType: "key_points", content: insights.keyPoints.join("\n") },
        { insightType: "tactics", content: insights.tactics.join("\n") },
        { insightType: "objections", content: insights.objections.join("\n") },
        { insightType: "tools", content: insights.tools.join("\n") },
      ].filter((record) => record.content.trim().length > 0);

      const insightEmbeddings = await step.run("embed-insights", async () => {
        return embedTexts(
          video.userId,
          insightRecords.map((insight) => insight.content),
          "ingestion_insight_embeddings",
        );
      });

      await step.run("upsert-video-insights", async () => {
        if (insightRecords.length === 0) {
          await db.delete(contentInsights).where(eq(contentInsights.contentItemId, video.id));
          return;
        }

        for (let i = 0; i < insightRecords.length; i += DB_BATCH_SIZE) {
          const insightBatch = insightRecords.slice(i, i + DB_BATCH_SIZE);
          const embeddingBatch = insightEmbeddings.slice(i, i + DB_BATCH_SIZE);

          const values = insightBatch.map((insight, index) => {
            const embedding = embeddingBatch[index];
            if (!embedding) {
              throw new Error("Insight embedding count does not match insight count.");
            }

            return {
              userId: video.userId,
              libraryId: video.libraryId,
              contentItemId: video.id,
              insightType: insight.insightType,
              content: insight.content,
              embedding,
            };
          });

          await db
            .insert(contentInsights)
            .values(values)
            .onConflictDoUpdate({
              target: [contentInsights.contentItemId, contentInsights.insightType],
              set: {
                content: sql`excluded.content`,
                embedding: sql`excluded.embedding`,
                updatedAt: sql`now()`,
              },
            });
        }

        await db
          .delete(contentInsights)
          .where(
            and(
              eq(contentInsights.contentItemId, video.id),
              notInArray(
                contentInsights.insightType,
                insightRecords.map((record) => record.insightType),
              ),
            ),
          );
      });

      await step.run("mark-ready", async () => {
        await db
          .update(contentItems)
          .set({
            status: "ready",
            failureReason: null,
            transcriptRaw: JSON.stringify(content.raw),
            summary: insights.summary,
            keyInsights: insights.keyPoints.join("\n"),
            chunkCount: chunkingResult.chunks.length,
            tokenCount: chunkingResult.totalTokenCount,
            updatedAt: sql`now()`,
          })
          .where(eq(contentItems.id, video.id));
      });

      try {
        await step.sendEvent("enqueue-video-billing-usage", {
          name: "billing.usage.video.record",
          data: {
            userId: video.userId,
            libraryId: video.libraryId,
            sourceId: event.data.sourceId,
            videoId: video.id,
            units: 1,
          },
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            area: "video.ingest.billing_usage_dispatch",
          },
          extra: {
            userId: video.userId,
            libraryId: video.libraryId,
            sourceId: event.data.sourceId,
            videoId: video.id,
          },
        });
      }

      await step.run("track-video-ready", async () => {
        await captureServerEvent(video.userId, "video_ready", {
          library_id: video.libraryId,
          video_id: video.id,
          source_id: event.data.sourceId,
          chunk_count: chunkingResult.chunks.length,
          token_count: chunkingResult.totalTokenCount,
        });
      });

      return {
        videoId: video.id,
        status: "ready",
        chunks: chunkingResult.chunks.length,
      };
    } catch (error) {
      const decision = classifyIngestionError(error);
      const reason = decision.reason;
      const stopRetrying = shouldStopRetrying({
        retryable: decision.retryable,
        attempt,
        maxAttempts,
      });

      if (decision.captureException) {
        Sentry.captureException(error);
      }

      await step.run("mark-failed", async () => {
        await db
          .update(contentItems)
          .set({
            status: "failed",
            failureReason: reason,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(contentItems.id, failureContext.videoId),
              eq(contentItems.userId, failureContext.userId),
              eq(contentItems.libraryId, failureContext.libraryId),
            ),
          );
      });

      await step.run("track-video-failed", async () => {
        await captureServerEvent(failureContext.userId, "video_failed", {
          library_id: failureContext.libraryId,
          video_id: failureContext.videoId,
          source_id: failureContext.sourceId,
          reason,
        });
      });

      if (stopRetrying) {
        return {
          videoId: failureContext.videoId,
          status: "failed",
          reason,
        };
      }

      throw error;
    }
  },
);
