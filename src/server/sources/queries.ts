import "server-only";

import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { contentItems, sourceContentItems, sources } from "@/db/schema";
import type { SourceType } from "@/lib/sources/types";

export type SourceStatus = "processing" | "ready" | "failed";

const sourceListSelect = {
  id: sources.id,
  url: sources.url,
  sourceType: sources.sourceType,
  status: sources.status,
  channelName: sources.channelName,
  title: sources.title,
  autoSyncEnabled: sources.autoSyncEnabled,
  nextSyncAt: sources.nextSyncAt,
  lastCheckedAt: sources.lastCheckedAt,
  lastSyncedAt: sources.lastSyncedAt,
  createdAt: sources.createdAt,
} as const;

export async function getLibrarySources(userId: string, libraryId: string) {
  return db
    .select(sourceListSelect)
    .from(sources)
    .where(and(eq(sources.userId, userId), eq(sources.libraryId, libraryId)))
    .orderBy(asc(sources.createdAt));
}

export async function getSourceBySourceKey(userId: string, libraryId: string, sourceKey: string) {
  const [source] = await db
    .select(sourceListSelect)
    .from(sources)
    .where(
      and(
        eq(sources.userId, userId),
        eq(sources.libraryId, libraryId),
        eq(sources.sourceKey, sourceKey),
      ),
    );

  return source ?? null;
}

export async function getSourceById(userId: string, libraryId: string, sourceId: string) {
  const [source] = await db
    .select(sourceListSelect)
    .from(sources)
    .where(
      and(eq(sources.id, sourceId), eq(sources.userId, userId), eq(sources.libraryId, libraryId)),
    );

  return source ?? null;
}

export async function createSource(
  userId: string,
  libraryId: string,
  url: string,
  sourceKey: string,
  sourceType: SourceType,
  status: SourceStatus,
  autoSyncEnabled: boolean,
  channelName: string | null,
  title: string | null,
) {
  const now = new Date();

  const [source] = await db
    .insert(sources)
    .values({
      userId,
      libraryId,
      url,
      sourceKey,
      sourceType,
      status,
      autoSyncEnabled,
      nextSyncAt: autoSyncEnabled ? now : null,
      channelName,
      title,
    })
    .onConflictDoNothing({
      target: [sources.libraryId, sources.sourceKey],
    })
    .returning(sourceListSelect);

  return source ?? null;
}

export async function deleteSource(userId: string, libraryId: string, sourceId: string) {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(sources)
      .where(and(eq(sources.id, sourceId), eq(sources.userId, userId), eq(sources.libraryId, libraryId)))
      .returning({
        id: sources.id,
      });

    if (!deleted) {
      return null;
    }

    await tx
      .delete(contentItems)
      .where(
        and(
          eq(contentItems.userId, userId),
          eq(contentItems.libraryId, libraryId),
          sql`not exists (
            select 1
            from ${sourceContentItems}
            where ${sourceContentItems.contentItemId} = ${contentItems.id}
          )`,
        ),
      );

    return deleted;
  });
}

export async function updateSourceStatus(
  userId: string,
  libraryId: string,
  sourceId: string,
  status: SourceStatus,
) {
  const [source] = await db
    .update(sources)
    .set({
      status,
      updatedAt: sql`now()`,
    })
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId), eq(sources.libraryId, libraryId)))
    .returning(sourceListSelect);

  return source ?? null;
}

export async function updateSourceAutoSync(
  userId: string,
  libraryId: string,
  sourceId: string,
  autoSyncEnabled: boolean,
) {
  const updateValues = autoSyncEnabled
    ? {
        autoSyncEnabled: true,
        nextSyncAt: sql`now()`,
        consecutiveSyncFailures: 0,
        updatedAt: sql`now()`,
      }
    : {
        autoSyncEnabled: false,
        nextSyncAt: null,
        updatedAt: sql`now()`,
      };

  const [source] = await db
    .update(sources)
    .set(updateValues)
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId), eq(sources.libraryId, libraryId)))
    .returning(sourceListSelect);

  return source ?? null;
}

export async function getDueAutoSyncSources(limit: number) {
  return db
    .select({
      id: sources.id,
      userId: sources.userId,
      libraryId: sources.libraryId,
    })
    .from(sources)
    .where(
      and(
        eq(sources.autoSyncEnabled, true),
        inArray(sources.sourceType, ["youtube_playlist", "youtube_channel"]),
        sql`${sources.status} <> 'processing'`,
        or(sql`${sources.nextSyncAt} is null`, lte(sources.nextSyncAt, sql`now()`)),
      ),
    )
    .orderBy(asc(sources.nextSyncAt), asc(sources.createdAt))
    .limit(limit);
}

export async function getSourceForSync(userId: string, libraryId: string, sourceId: string) {
  const [source] = await db
    .select({
      id: sources.id,
      userId: sources.userId,
      libraryId: sources.libraryId,
      sourceType: sources.sourceType,
      url: sources.url,
      status: sources.status,
      autoSyncEnabled: sources.autoSyncEnabled,
      syncCursor: sources.syncCursor,
      nextSyncAt: sources.nextSyncAt,
      consecutiveSyncFailures: sources.consecutiveSyncFailures,
      channelName: sources.channelName,
      title: sources.title,
    })
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId), eq(sources.libraryId, libraryId)));

  return source ?? null;
}

export async function updateSourceSyncState(
  userId: string,
  libraryId: string,
  sourceId: string,
  input: {
    syncCursor?: Record<string, unknown> | null;
    nextSyncAt?: Date | null;
    lastCheckedAt?: Date | null;
    lastSyncedAt?: Date | null;
    lastSyncErrorAt?: Date | null;
    consecutiveSyncFailures?: number;
    channelName?: string | null;
    title?: string | null;
  },
) {
  const [source] = await db
    .update(sources)
    .set({
      syncCursor: input.syncCursor,
      nextSyncAt: input.nextSyncAt,
      lastCheckedAt: input.lastCheckedAt,
      lastSyncedAt: input.lastSyncedAt,
      lastSyncErrorAt: input.lastSyncErrorAt,
      consecutiveSyncFailures: input.consecutiveSyncFailures,
      channelName: input.channelName,
      title: input.title,
      updatedAt: sql`now()`,
    })
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId), eq(sources.libraryId, libraryId)))
    .returning(sourceListSelect);

  return source ?? null;
}
