import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { sources } from "@/db/schema";
import type { YouTubeSourceType } from "@/lib/validation/sources";

export type SourceStatus = "processing" | "ready" | "failed";

export async function getLibrarySources(userId: string, libraryId: string) {
  return db
    .select({
      id: sources.id,
      url: sources.url,
      sourceType: sources.sourceType,
      status: sources.status,
      channelName: sources.channelName,
      title: sources.title,
      createdAt: sources.createdAt,
    })
    .from(sources)
    .where(and(eq(sources.userId, userId), eq(sources.libraryId, libraryId)))
    .orderBy(asc(sources.createdAt));
}

export async function getSourceBySourceKey(userId: string, libraryId: string, sourceKey: string) {
  const [source] = await db
    .select({
      id: sources.id,
      url: sources.url,
      sourceType: sources.sourceType,
      status: sources.status,
      channelName: sources.channelName,
      title: sources.title,
      createdAt: sources.createdAt,
    })
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

export async function createSource(
  userId: string,
  libraryId: string,
  url: string,
  sourceKey: string,
  sourceType: YouTubeSourceType,
  status: SourceStatus,
  channelName: string | null,
  title: string | null,
) {
  const [source] = await db
    .insert(sources)
    .values({ userId, libraryId, url, sourceKey, sourceType, status, channelName, title })
    .onConflictDoNothing({
      target: [sources.libraryId, sources.sourceKey],
    })
    .returning({
      id: sources.id,
      url: sources.url,
      sourceType: sources.sourceType,
      status: sources.status,
      channelName: sources.channelName,
      title: sources.title,
      createdAt: sources.createdAt,
    });

  return source ?? null;
}

export async function deleteSource(userId: string, libraryId: string, sourceId: string) {
  const [deleted] = await db
    .delete(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId), eq(sources.libraryId, libraryId)))
    .returning({
      id: sources.id,
    });

  return deleted ?? null;
}
