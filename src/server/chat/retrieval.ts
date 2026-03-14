import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { videoChunks, videoInsights, videos } from "@/db/schema";
import type { RetrievalCandidate } from "@/server/chat/types";

const CHUNK_VECTOR_LIMIT = 40;
const INSIGHT_VECTOR_LIMIT = 20;
const CHUNK_FTS_LIMIT = 25;

type RetrievalParams = {
  userId: string;
  libraryId: string;
  query: string;
  embedding: number[];
};

export async function runHybridRetrieval(params: RetrievalParams): Promise<RetrievalCandidate[]> {
  const [chunkVector, insightVector, chunkFts] = await Promise.all([
    searchChunkVector(params),
    searchInsightVector(params),
    searchChunkFts(params),
  ]);

  return [...chunkVector, ...insightVector, ...chunkFts];
}

async function searchChunkVector(params: RetrievalParams): Promise<RetrievalCandidate[]> {
  if (params.embedding.length === 0) {
    return [];
  }

  const embeddingLiteral = JSON.stringify(params.embedding);
  const cosineDistance = sql<number>`${videoChunks.embedding} <=> ${embeddingLiteral}::vector`;

  const rows = await db
    .select({
      id: videoChunks.id,
      rawScore: cosineDistance,
      videoId: videoChunks.videoId,
      youtubeVideoId: videos.youtubeVideoId,
      videoTitle: videoChunks.videoTitle,
      text: videoChunks.chunkText,
      startSeconds: videoChunks.startSeconds,
      endSeconds: videoChunks.endSeconds,
    })
    .from(videoChunks)
    .innerJoin(videos, eq(videos.id, videoChunks.videoId))
    .where(
      and(
        eq(videoChunks.userId, params.userId),
        eq(videoChunks.libraryId, params.libraryId),
        eq(videos.userId, params.userId),
        eq(videos.libraryId, params.libraryId),
        eq(videos.status, "ready"),
      ),
    )
    .orderBy(asc(cosineDistance))
    .limit(CHUNK_VECTOR_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    channel: "chunk_vector",
    rawScore: Number(row.rawScore ?? 1),
    videoId: row.videoId,
    youtubeVideoId: row.youtubeVideoId,
    videoTitle: row.videoTitle,
    text: row.text,
    insightType: null,
    startSeconds: row.startSeconds,
    endSeconds: row.endSeconds,
  }));
}

async function searchInsightVector(params: RetrievalParams): Promise<RetrievalCandidate[]> {
  if (params.embedding.length === 0) {
    return [];
  }

  const embeddingLiteral = JSON.stringify(params.embedding);
  const cosineDistance = sql<number>`${videoInsights.embedding} <=> ${embeddingLiteral}::vector`;

  const rows = await db
    .select({
      id: videoInsights.id,
      rawScore: cosineDistance,
      videoId: videoInsights.videoId,
      youtubeVideoId: videos.youtubeVideoId,
      videoTitle: videos.title,
      text: videoInsights.content,
      insightType: videoInsights.insightType,
    })
    .from(videoInsights)
    .innerJoin(videos, eq(videos.id, videoInsights.videoId))
    .where(
      and(
        eq(videoInsights.userId, params.userId),
        eq(videoInsights.libraryId, params.libraryId),
        eq(videos.userId, params.userId),
        eq(videos.libraryId, params.libraryId),
        eq(videos.status, "ready"),
      ),
    )
    .orderBy(asc(cosineDistance))
    .limit(INSIGHT_VECTOR_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    channel: "insight_vector",
    rawScore: Number(row.rawScore ?? 1),
    videoId: row.videoId,
    youtubeVideoId: row.youtubeVideoId,
    videoTitle: row.videoTitle,
    text: row.text,
    insightType: row.insightType,
    startSeconds: null,
    endSeconds: null,
  }));
}

async function searchChunkFts(params: RetrievalParams): Promise<RetrievalCandidate[]> {
  const query = params.query.trim();
  if (query.length === 0) {
    return [];
  }

  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  const rank = sql<number>`ts_rank_cd(to_tsvector('english', ${videoChunks.chunkText}), ${tsQuery})`;

  const rows = await db
    .select({
      id: videoChunks.id,
      rawScore: rank,
      videoId: videoChunks.videoId,
      youtubeVideoId: videos.youtubeVideoId,
      videoTitle: videoChunks.videoTitle,
      text: videoChunks.chunkText,
      startSeconds: videoChunks.startSeconds,
      endSeconds: videoChunks.endSeconds,
    })
    .from(videoChunks)
    .innerJoin(videos, eq(videos.id, videoChunks.videoId))
    .where(
      and(
        eq(videoChunks.userId, params.userId),
        eq(videoChunks.libraryId, params.libraryId),
        eq(videos.userId, params.userId),
        eq(videos.libraryId, params.libraryId),
        eq(videos.status, "ready"),
        sql`to_tsvector('english', ${videoChunks.chunkText}) @@ ${tsQuery}`,
      ),
    )
    .orderBy(desc(rank))
    .limit(CHUNK_FTS_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    channel: "chunk_fts",
    rawScore: Number(row.rawScore ?? 0),
    videoId: row.videoId,
    youtubeVideoId: row.youtubeVideoId,
    videoTitle: row.videoTitle,
    text: row.text,
    insightType: null,
    startSeconds: row.startSeconds,
    endSeconds: row.endSeconds,
  }));
}
