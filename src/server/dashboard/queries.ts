import "server-only";

import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { chatMessages, chatSessions, contentItems, libraries } from "@/db/schema";
import type { DashboardSummary, DashboardTotals } from "@/features/dashboard/types";

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const todayUtc = new Date();
  const utcMidnightToday = new Date(
    Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()),
  );
  const activityWindowStartUtc = new Date(utcMidnightToday);
  activityWindowStartUtc.setUTCDate(utcMidnightToday.getUTCDate() - 29);

  const utcActivityDateExpr = sql<string>`date(timezone('UTC', ${contentItems.createdAt}))::text`;

  const [
    libraryRows,
    videoAggregateRows,
    sessionAggregateRows,
    recentSessionRows,
    activityRows,
  ] = await Promise.all([
    db
      .select({
        id: libraries.id,
        name: libraries.name,
        createdAt: libraries.createdAt,
      })
      .from(libraries)
      .where(eq(libraries.userId, userId))
      .orderBy(desc(libraries.createdAt)),

    db
      .select({
        libraryId: contentItems.libraryId,
        videoTotal: sql<number>`count(*)`,
        videoReady: sql<number>`count(case when ${contentItems.status} = 'ready' then 1 end)`,
        videoPending: sql<number>`count(case when ${contentItems.status} = 'pending' then 1 end)`,
        videoProcessing: sql<number>`count(case when ${contentItems.status} = 'processing' then 1 end)`,
        videoFailed: sql<number>`count(case when ${contentItems.status} = 'failed' then 1 end)`,
      })
      .from(contentItems)
      .where(eq(contentItems.userId, userId))
      .groupBy(contentItems.libraryId),

    db
      .select({
        libraryId: chatSessions.libraryId,
        chatSessionCount: sql<number>`count(*)`,
        lastActivityAt: sql<Date | null>`max(${chatSessions.lastMessageAt})`,
      })
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .groupBy(chatSessions.libraryId),

    db
      .select({
        id: chatSessions.id,
        title: chatSessions.title,
        libraryId: chatSessions.libraryId,
        libraryName: libraries.name,
        lastMessageAt: chatSessions.lastMessageAt,
        createdAt: chatSessions.createdAt,
      })
      .from(chatSessions)
      .innerJoin(libraries, eq(libraries.id, chatSessions.libraryId))
      .where(eq(chatSessions.userId, userId))
      .orderBy(sql`coalesce(${chatSessions.lastMessageAt}, ${chatSessions.createdAt}) desc`)
      .limit(8),

    db
      .select({
        date: utcActivityDateExpr,
        videosAdded: sql<number>`count(*)`,
      })
      .from(contentItems)
      .where(and(eq(contentItems.userId, userId), gte(contentItems.createdAt, activityWindowStartUtc)))
      .groupBy(utcActivityDateExpr)
      .orderBy(utcActivityDateExpr),
  ]);

  const recentSessionIds = recentSessionRows.map((session) => session.id);
  const recentSessionMessageCounts =
    recentSessionIds.length === 0
      ? []
      : await db
          .select({
            sessionId: chatMessages.sessionId,
            messageCount: sql<number>`count(*)`,
          })
          .from(chatMessages)
          .where(and(eq(chatMessages.userId, userId), inArray(chatMessages.sessionId, recentSessionIds)))
          .groupBy(chatMessages.sessionId);

  const videoAggregatesByLibraryId = new Map(
    videoAggregateRows.map((row) => [
      row.libraryId,
      {
        videoTotal: Number(row.videoTotal),
        videoReady: Number(row.videoReady),
        videoPending: Number(row.videoPending),
        videoProcessing: Number(row.videoProcessing),
        videoFailed: Number(row.videoFailed),
      },
    ]),
  );

  const sessionAggregatesByLibraryId = new Map(
    sessionAggregateRows.map((row) => [
      row.libraryId,
      {
        chatSessionCount: Number(row.chatSessionCount),
        lastActivityAt: row.lastActivityAt,
      },
    ]),
  );

  const messageCountBySessionId = new Map(
    recentSessionMessageCounts.map((row) => [row.sessionId, Number(row.messageCount)]),
  );

  const librariesWithAggregates = libraryRows.map((library) => {
    const videoAggregate = videoAggregatesByLibraryId.get(library.id);
    const sessionAggregate = sessionAggregatesByLibraryId.get(library.id);

    return {
      id: library.id,
      name: library.name,
      createdAt: library.createdAt.toISOString(),
      videoTotal: videoAggregate?.videoTotal ?? 0,
      videoReady: videoAggregate?.videoReady ?? 0,
      videoPending: videoAggregate?.videoPending ?? 0,
      videoProcessing: videoAggregate?.videoProcessing ?? 0,
      videoFailed: videoAggregate?.videoFailed ?? 0,
      chatSessionCount: sessionAggregate?.chatSessionCount ?? 0,
      lastActivityAt: toIsoString(sessionAggregate?.lastActivityAt),
    };
  });

  const totals: DashboardTotals = {
    libraries: librariesWithAggregates.length,
    videos: librariesWithAggregates.reduce((sum, row) => sum + row.videoTotal, 0),
    readyVideos: librariesWithAggregates.reduce((sum, row) => sum + row.videoReady, 0),
    processingVideos: librariesWithAggregates.reduce(
      (sum, row) => sum + row.videoPending + row.videoProcessing,
      0,
    ),
    chatSessions: librariesWithAggregates.reduce((sum, row) => sum + row.chatSessionCount, 0),
  };

  const activityByDate = new Map(activityRows.map((row) => [row.date, Number(row.videosAdded)]));
  const activityByDay = buildActivitySeries(activityWindowStartUtc, 30, activityByDate);

  return {
    libraries: librariesWithAggregates,
    recentSessions: recentSessionRows.map((row) => ({
      id: row.id,
      title: row.title,
      libraryId: row.libraryId,
      libraryName: row.libraryName,
      lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      messageCount: messageCountBySessionId.get(row.id) ?? 0,
    })),
    activityByDay,
    totals,
  };
}

function buildActivitySeries(
  startDateUtc: Date,
  dayCount: number,
  activityByDate: Map<string, number>,
) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(startDateUtc);
    date.setUTCDate(startDateUtc.getUTCDate() + index);

    const dateKey = date.toISOString().slice(0, 10);

    return {
      date: dateKey,
      label: formatter.format(date),
      videosAdded: activityByDate.get(dateKey) ?? 0,
    };
  });
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}
