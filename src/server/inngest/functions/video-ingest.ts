import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, eq, gte, notInArray, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { db } from "@/db";
import { videoChunks, videoInsights, videos } from "@/db/schema";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { classifyIngestionError } from "@/server/ingestion/errors";
import { chunkTranscriptSegments } from "@/server/ingestion/chunking";
import { embedTexts, generateInsights } from "@/server/ingestion/openai";
import { fetchTranscript, TranscriptUnavailableError } from "@/server/ingestion/transcript";
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
            id: videos.id,
            userId: videos.userId,
            libraryId: videos.libraryId,
            youtubeVideoId: videos.youtubeVideoId,
            title: videos.title,
            status: videos.status,
          })
          .from(videos)
          .where(
            and(
              eq(videos.id, event.data.videoId),
              eq(videos.userId, event.data.userId),
              eq(videos.libraryId, event.data.libraryId),
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

      await step.run("mark-processing", async () => {
        await db
          .update(videos)
          .set({
            status: "processing",
            failureReason: null,
            updatedAt: sql`now()`,
          })
          .where(eq(videos.id, video.id));
      });

      const transcript = await runIngestionStep(step, "fetch-transcript", async () => {
        return fetchTranscript(video.youtubeVideoId);
      });

      const transcriptText = transcript.segments.map((segment) => segment.text).join(" ");

      const chunkingResult = await step.run("chunk-transcript", async () => {
        return chunkTranscriptSegments(transcript.segments);
      });

      if (chunkingResult.chunks.length === 0) {
        throw new TranscriptUnavailableError("Transcript produced zero chunks.", true);
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
              videoId: video.id,
              chunkIndex: chunk.chunkIndex,
              chunkText: chunk.chunkText,
              videoTitle: video.title,
              startSeconds: chunk.startSeconds,
              endSeconds: chunk.endSeconds,
              embedding,
            };
          });

          await db
            .insert(videoChunks)
            .values(values)
            .onConflictDoUpdate({
              target: [videoChunks.videoId, videoChunks.chunkIndex],
              set: {
                chunkText: sql`excluded.chunk_text`,
                videoTitle: sql`excluded.video_title`,
                startSeconds: sql`excluded.start_seconds`,
                endSeconds: sql`excluded.end_seconds`,
                embedding: sql`excluded.embedding`,
                updatedAt: sql`now()`,
              },
            });
        }

        await db
          .delete(videoChunks)
          .where(
            and(
              eq(videoChunks.videoId, video.id),
              gte(videoChunks.chunkIndex, chunkingResult.chunks.length),
            ),
          );
      });

      const insights = await step.run("generate-insights", async () => {
        return generateInsights(video.userId, video.title, transcriptText);
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
          await db.delete(videoInsights).where(eq(videoInsights.videoId, video.id));
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
              videoId: video.id,
              insightType: insight.insightType,
              content: insight.content,
              embedding,
            };
          });

          await db
            .insert(videoInsights)
            .values(values)
            .onConflictDoUpdate({
              target: [videoInsights.videoId, videoInsights.insightType],
              set: {
                content: sql`excluded.content`,
                embedding: sql`excluded.embedding`,
                updatedAt: sql`now()`,
              },
            });
        }

        await db
          .delete(videoInsights)
          .where(
            and(
              eq(videoInsights.videoId, video.id),
              notInArray(
                videoInsights.insightType,
                insightRecords.map((record) => record.insightType),
              ),
            ),
          );
      });

      await step.run("mark-ready", async () => {
        await db
          .update(videos)
          .set({
            status: "ready",
            failureReason: null,
            transcriptRaw: JSON.stringify(transcript.raw),
            summary: insights.summary,
            keyInsights: insights.keyPoints.join("\n"),
            chunkCount: chunkingResult.chunks.length,
            tokenCount: chunkingResult.totalTokenCount,
            updatedAt: sql`now()`,
          })
          .where(eq(videos.id, video.id));
      });

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
          .update(videos)
          .set({
            status: "failed",
            failureReason: reason,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(videos.id, failureContext.videoId),
              eq(videos.userId, failureContext.userId),
              eq(videos.libraryId, failureContext.libraryId),
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
