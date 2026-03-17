import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { contentItems, sources } from "@/db/schema";
import { isContentType, type ContentType } from "@/lib/sources/types";

export type VideoIngestionStatus = "pending" | "processing" | "ready" | "failed";

export type LibraryVideoProgressItem = {
  id: string;
  externalId: string;
  contentType: ContentType;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  status: VideoIngestionStatus;
  failureReason: string | null;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type LibraryVideosProgress = {
  videos: LibraryVideoProgressItem[];
  counts: {
    total: number;
    pending: number;
    processing: number;
    ready: number;
    failed: number;
  };
  hasInFlight: boolean;
  isProcessing: boolean;
  isSettled: boolean;
};

export async function getLibraryVideosProgress(
  userId: string,
  libraryId: string,
): Promise<LibraryVideosProgress> {
  const [videoRows, sourceProcessingCountResult] = await Promise.all([
    db
      .select({
        id: contentItems.id,
        externalId: contentItems.externalId,
        contentType: contentItems.contentType,
        title: contentItems.title,
        thumbnailUrl: contentItems.thumbnailUrl,
        channelName: contentItems.channelName,
        status: contentItems.status,
        failureReason: contentItems.failureReason,
        publishedAt: contentItems.publishedAt,
        createdAt: contentItems.createdAt,
        updatedAt: contentItems.updatedAt,
      })
      .from(contentItems)
      .where(and(eq(contentItems.userId, userId), eq(contentItems.libraryId, libraryId)))
      .orderBy(desc(contentItems.createdAt), desc(contentItems.updatedAt)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(sources)
      .where(
        and(
          eq(sources.userId, userId),
          eq(sources.libraryId, libraryId),
          eq(sources.status, "processing"),
        ),
      ),
  ]);

  const sourceProcessingCount = Number(sourceProcessingCountResult[0]?.count ?? 0);

  const normalizedVideos = videoRows.flatMap((row) => {
    const contentType = normalizeContentType(row.contentType, row.id);
    if (!contentType) {
      return [];
    }

    return [{
      ...row,
      contentType,
      status: normalizeStatus(row.status),
    }];
  });

  const counts = {
    total: normalizedVideos.length,
    pending: 0,
    processing: 0,
    ready: 0,
    failed: 0,
  };

  for (const video of normalizedVideos) {
    if (video.status === "pending") {
      counts.pending += 1;
      continue;
    }

    if (video.status === "processing") {
      counts.processing += 1;
      continue;
    }

    if (video.status === "ready") {
      counts.ready += 1;
      continue;
    }

    counts.failed += 1;
  }

  const hasInFlight = counts.pending + counts.processing > 0;
  const isProcessing = sourceProcessingCount > 0;
  const isSettled = counts.total > 0 && !hasInFlight && !isProcessing;

  return {
    videos: normalizedVideos,
    counts,
    hasInFlight,
    isProcessing,
    isSettled,
  };
}

function normalizeStatus(status: string): VideoIngestionStatus {
  if (status === "pending" || status === "processing" || status === "ready" || status === "failed") {
    return status;
  }

  return "pending";
}

function normalizeContentType(contentType: string, videoId: string): ContentType | null {
  if (isContentType(contentType)) {
    return contentType;
  }

  Sentry.captureMessage("Invalid content type in videos query row.", {
    level: "warning",
    tags: {
      area: "videos.queries.invalid_content_type",
    },
    extra: {
      videoId,
      contentType,
    },
  });

  return null;
}
