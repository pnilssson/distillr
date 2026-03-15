import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { libraries } from "@/db/schema";

export async function getUserLibraries(userId: string) {
  return db
    .select({ id: libraries.id, name: libraries.name, createdAt: libraries.createdAt })
    .from(libraries)
    .where(eq(libraries.userId, userId))
    .orderBy(desc(libraries.createdAt));
}

export async function createLibrary(userId: string, name: string) {
  const [library] = await db
    .insert(libraries)
    .values({ userId, name })
    .returning({ id: libraries.id, name: libraries.name, createdAt: libraries.createdAt });
  return library ?? null;
}

export async function deleteLibrary(userId: string, libraryId: string) {
  await db
    .delete(libraries)
    .where(and(eq(libraries.id, libraryId), eq(libraries.userId, userId)));
}

export async function getLibraryById(userId: string, libraryId: string) {
  const [library] = await db
    .select({ id: libraries.id })
    .from(libraries)
    .where(and(eq(libraries.id, libraryId), eq(libraries.userId, userId)));
  return library ?? null;
}

export async function updateLibrary(userId: string, libraryId: string, name: string) {
  const [library] = await db
    .update(libraries)
    .set({ name, updatedAt: sql`now()` })
    .where(and(eq(libraries.id, libraryId), eq(libraries.userId, userId)))
    .returning({ id: libraries.id, name: libraries.name });
  return library ?? null;
}
