import "server-only";

import { sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { db } from "@/db";
import { contentItems, sourceContentItems } from "@/db/schema";
import { getPolarCustomerState } from "@/server/billing/polar/customers";
import { isPolarBillingEnabled } from "@/server/billing/polar/config";
import { buildBillingSnapshot } from "@/server/billing/polar/state";
import { isContentType, type ContentType, type DiscoveredItem } from "@/server/ingestion/providers/types";

export const VIDEO_DB_BATCH_SIZE = 100;
export const VIDEO_EVENT_BATCH_SIZE = 100;

type IngestionAllowance = {
  monthlyRemaining: number;
  lifetimeRemaining: number;
};

type SourceIdentity = {
  id: string;
  userId: string;
  libraryId: string;
};

type ContentItemRow = {
  id: string;
  contentType: string;
  externalId: string;
  status: string;
};

type QueueRow = {
  id: string;
  contentType: string;
};

export type QueuePlan = {
  dedupedCount: number;
  queuedCount: number;
  deferredCount: number;
  rowsToQueue: QueueRow[];
};

export async function planAndQueueSourceItems(
  source: SourceIdentity,
  discoveredItems: DiscoveredItem[],
): Promise<QueuePlan> {
  const dedupedItems = Array.from(
    new Map(discoveredItems.map((item) => [`${item.contentType}:${item.externalId}`, item])).values(),
  );

  if (dedupedItems.length === 0) {
    return {
      dedupedCount: 0,
      queuedCount: 0,
      deferredCount: 0,
      rowsToQueue: [],
    };
  }

  const upsertedRows: ContentItemRow[] = [];

  for (let i = 0; i < dedupedItems.length; i += VIDEO_DB_BATCH_SIZE) {
    const batch = dedupedItems.slice(i, i + VIDEO_DB_BATCH_SIZE);

    const rows = await db
      .insert(contentItems)
      .values(
        batch.map((item) => ({
          userId: source.userId,
          libraryId: source.libraryId,
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
        target: [contentItems.libraryId, contentItems.contentType, contentItems.externalId],
        set: {
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
        id: contentItems.id,
        contentType: contentItems.contentType,
        externalId: contentItems.externalId,
        status: contentItems.status,
      });

    upsertedRows.push(...rows);
  }

  const rowsByIdentity = new Map(
    upsertedRows.map((row) => [`${row.contentType}:${row.externalId}`, row] as const),
  );

  const relationships = dedupedItems
    .map((item) => rowsByIdentity.get(`${item.contentType}:${item.externalId}`))
    .filter((row): row is ContentItemRow => Boolean(row))
    .map((row) => ({
      userId: source.userId,
      libraryId: source.libraryId,
      sourceId: source.id,
      contentItemId: row.id,
    }));

  for (let i = 0; i < relationships.length; i += VIDEO_DB_BATCH_SIZE) {
    const batch = relationships.slice(i, i + VIDEO_DB_BATCH_SIZE);

    await db
      .insert(sourceContentItems)
      .values(batch)
      .onConflictDoUpdate({
        target: [sourceContentItems.sourceId, sourceContentItems.contentItemId],
        set: {
          updatedAt: sql`now()`,
        },
      });
  }

  const queueCandidates = dedupedItems
    .map((item) => rowsByIdentity.get(`${item.contentType}:${item.externalId}`))
    .filter((row): row is ContentItemRow => Boolean(row))
    .filter((row) => row.status === "pending" || row.status === "failed");

  const allowance = await getIngestionAllowanceForUser(source.userId);

  const allowedCount = Math.max(
    0,
    Math.min(queueCandidates.length, allowance.monthlyRemaining, allowance.lifetimeRemaining),
  );

  const rowsToQueue = queueCandidates.slice(0, allowedCount).map((row) => ({
    id: row.id,
    contentType: row.contentType,
  }));
  const deferredCount = queueCandidates.length - rowsToQueue.length;

  return {
    dedupedCount: dedupedItems.length,
    queuedCount: rowsToQueue.length,
    deferredCount,
    rowsToQueue,
  };
}

export async function sendVideoIngestEvents(
  source: SourceIdentity,
  rowsToQueue: QueueRow[],
  sendBatch: (
    batchId: number,
    events: Array<{ name: "video.ingest"; data: VideoIngestEventData }>,
  ) => Promise<unknown>,
) {
  for (let i = 0; i < rowsToQueue.length; i += VIDEO_EVENT_BATCH_SIZE) {
    const batch = rowsToQueue.slice(i, i + VIDEO_EVENT_BATCH_SIZE);
    const batchId = i / VIDEO_EVENT_BATCH_SIZE;

    await sendBatch(
      batchId,
      batch.map((row) => ({
        name: "video.ingest" as const,
        data: {
          userId: source.userId,
          libraryId: source.libraryId,
          sourceId: source.id,
          videoId: row.id,
          contentType: normalizeContentTypeForEvent(row.contentType),
        },
      })),
    );
  }
}

type VideoIngestEventData = {
  userId: string;
  libraryId: string;
  sourceId: string;
  videoId: string;
  contentType: ContentType;
};

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

function normalizeContentTypeForEvent(contentType: string): ContentType {
  if (isContentType(contentType)) {
    return contentType;
  }

  throw new NonRetriableError(`Unsupported content type: ${contentType}`);
}
