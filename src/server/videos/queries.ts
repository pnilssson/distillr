import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { sources, videos } from "@/db/schema";

export type VideoIngestionStatus = "pending" | "processing" | "ready" | "failed";

export type LibraryVideoProgressItem = {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  status: VideoIngestionStatus;
  failureReason: string | null;
  publishedAt: Date;
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

const STATUS_ORDER = sql<number>`
  case
    when ${videos.status} = 'processing' then 0
    when ${videos.status} = 'pending' then 1
    when ${videos.status} = 'failed' then 2
    when ${videos.status} = 'ready' then 3
    else 4
  end
`;

export async function getLibraryVideosProgress(
  userId: string,
  libraryId: string,
): Promise<LibraryVideosProgress> {
  const [videoRows, sourceProcessingCountResult] = await Promise.all([
    db
      .select({
        id: videos.id,
        title: videos.title,
        thumbnailUrl: videos.thumbnailUrl,
        channelName: videos.channelName,
        status: videos.status,
        failureReason: videos.failureReason,
        publishedAt: videos.publishedAt,
        updatedAt: videos.updatedAt,
      })
      .from(videos)
      .where(and(eq(videos.userId, userId), eq(videos.libraryId, libraryId)))
      .orderBy(STATUS_ORDER, desc(videos.updatedAt)),
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

  const normalizedVideos = videoRows.map((row) => ({
    ...row,
    status: normalizeStatus(row.status),
  }));

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
