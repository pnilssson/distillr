import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { videoChunks, videoInsights, videos } from "@/db/schema";
import { isContentType, type ContentType } from "@/lib/sources/types";
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

function normalizeContentType(contentType: string, candidateId: string): ContentType | null {
  if (isContentType(contentType)) {
    return contentType;
  }

  Sentry.captureMessage("Invalid content type in retrieval row.", {
    level: "warning",
    tags: {
      area: "chat.retrieval.invalid_content_type",
    },
    extra: {
      candidateId,
      contentType,
    },
  });

  return null;
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
      externalId: videos.externalId,
      contentType: videos.contentType,
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

  return rows.flatMap((row) => {
    const contentType = normalizeContentType(row.contentType, row.id);
    if (!contentType) {
      return [];
    }

    return [{
      id: row.id,
      channel: "chunk_vector" as const,
      rawScore: Number(row.rawScore ?? 1),
      videoId: row.videoId,
      externalId: row.externalId,
      contentType,
      videoTitle: row.videoTitle,
      text: row.text,
      insightType: null,
      startSeconds: row.startSeconds,
      endSeconds: row.endSeconds,
    }];
  });
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
      externalId: videos.externalId,
      contentType: videos.contentType,
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

  return rows.flatMap((row) => {
    const contentType = normalizeContentType(row.contentType, row.id);
    if (!contentType) {
      return [];
    }

    return [{
      id: row.id,
      channel: "insight_vector" as const,
      rawScore: Number(row.rawScore ?? 1),
      videoId: row.videoId,
      externalId: row.externalId,
      contentType,
      videoTitle: row.videoTitle,
      text: row.text,
      insightType: row.insightType,
      startSeconds: null,
      endSeconds: null,
    }];
  });
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
      externalId: videos.externalId,
      contentType: videos.contentType,
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

  return rows.flatMap((row) => {
    const contentType = normalizeContentType(row.contentType, row.id);
    if (!contentType) {
      return [];
    }

    return [{
      id: row.id,
      channel: "chunk_fts" as const,
      rawScore: Number(row.rawScore ?? 0),
      videoId: row.videoId,
      externalId: row.externalId,
      contentType,
      videoTitle: row.videoTitle,
      text: row.text,
      insightType: null,
      startSeconds: row.startSeconds,
      endSeconds: row.endSeconds,
    }];
  });
}
