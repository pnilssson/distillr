import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { sources } from "@/db/schema";
import type { YouTubeSourceType } from "@/lib/validation/sources";

export async function getLibrarySources(userId: string, libraryId: string) {
  return db
    .select({
      id: sources.id,
      url: sources.url,
      sourceType: sources.sourceType,
      createdAt: sources.createdAt,
    })
    .from(sources)
    .where(and(eq(sources.userId, userId), eq(sources.libraryId, libraryId)))
    .orderBy(asc(sources.createdAt));
}

export async function createSource(
  userId: string,
  libraryId: string,
  url: string,
  sourceType: YouTubeSourceType,
) {
  const [source] = await db
    .insert(sources)
    .values({ userId, libraryId, url, sourceType })
    .returning({
      id: sources.id,
      url: sources.url,
      sourceType: sources.sourceType,
      createdAt: sources.createdAt,
    });
  return source ?? null;
}
