import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { contentChunks, contentInsights, contentItems } from "@/db/schema";
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
  const cosineDistance = sql<number>`${contentChunks.embedding} <=> ${embeddingLiteral}::vector`;

  const rows = await db
    .select({
      id: contentChunks.id,
      rawScore: cosineDistance,
      videoId: contentChunks.contentItemId,
      externalId: contentItems.externalId,
      contentType: contentItems.contentType,
      videoTitle: contentChunks.itemTitle,
      text: contentChunks.chunkText,
      startSeconds: contentChunks.startSeconds,
      endSeconds: contentChunks.endSeconds,
    })
    .from(contentChunks)
    .innerJoin(contentItems, eq(contentItems.id, contentChunks.contentItemId))
    .where(
      and(
        eq(contentChunks.userId, params.userId),
        eq(contentChunks.libraryId, params.libraryId),
        eq(contentItems.userId, params.userId),
        eq(contentItems.libraryId, params.libraryId),
        eq(contentItems.status, "ready"),
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
  const cosineDistance = sql<number>`${contentInsights.embedding} <=> ${embeddingLiteral}::vector`;

  const rows = await db
    .select({
      id: contentInsights.id,
      rawScore: cosineDistance,
      videoId: contentInsights.contentItemId,
      externalId: contentItems.externalId,
      contentType: contentItems.contentType,
      videoTitle: contentItems.title,
      text: contentInsights.content,
      insightType: contentInsights.insightType,
    })
    .from(contentInsights)
    .innerJoin(contentItems, eq(contentItems.id, contentInsights.contentItemId))
    .where(
      and(
        eq(contentInsights.userId, params.userId),
        eq(contentInsights.libraryId, params.libraryId),
        eq(contentItems.userId, params.userId),
        eq(contentItems.libraryId, params.libraryId),
        eq(contentItems.status, "ready"),
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
  const rank = sql<number>`ts_rank_cd(to_tsvector('english', ${contentChunks.chunkText}), ${tsQuery})`;

  const rows = await db
    .select({
      id: contentChunks.id,
      rawScore: rank,
      videoId: contentChunks.contentItemId,
      externalId: contentItems.externalId,
      contentType: contentItems.contentType,
      videoTitle: contentChunks.itemTitle,
      text: contentChunks.chunkText,
      startSeconds: contentChunks.startSeconds,
      endSeconds: contentChunks.endSeconds,
    })
    .from(contentChunks)
    .innerJoin(contentItems, eq(contentItems.id, contentChunks.contentItemId))
    .where(
      and(
        eq(contentChunks.userId, params.userId),
        eq(contentChunks.libraryId, params.libraryId),
        eq(contentItems.userId, params.userId),
        eq(contentItems.libraryId, params.libraryId),
        eq(contentItems.status, "ready"),
        sql`to_tsvector('english', ${contentChunks.chunkText}) @@ ${tsQuery}`,
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
