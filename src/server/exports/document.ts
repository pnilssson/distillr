import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { contentChunks, contentItems } from "@/db/schema";
import { isContentType } from "@/lib/sources/types";
import { buildItemUrl } from "@/lib/sources/url";
import { getChatSessionById, listChatMessages } from "@/server/chat/queries";
import type { ChatSourcesRollup } from "@/server/chat/types";
import type { ExportDocument } from "@/server/exports/types";

type BuildChatSessionExportDocumentInput = {
  userId: string;
  libraryId: string;
  sessionId: string;
};

type BuildContentItemExportDocumentInput = {
  userId: string;
  libraryId: string;
  contentItemId: string;
};

type TranscriptSegment = {
  startSeconds: number;
  text: string;
};

export async function buildChatSessionExportDocument(
  input: BuildChatSessionExportDocumentInput,
): Promise<ExportDocument | null> {
  const session = await getChatSessionById(input.userId, input.libraryId, input.sessionId);
  if (!session) {
    return null;
  }

  const messages = await listAllChatMessages(input.userId, input.libraryId, input.sessionId);

  const sections: ExportDocument["sections"] = [
    {
      heading: "Conversation",
      lines: messages.flatMap((message) => {
        const createdAt = message.createdAt.toISOString();
        const roleLabel = message.role === "assistant" ? "Assistant" : "User";
        const base = [`[${roleLabel}] ${createdAt}`, message.content.trim() || "(No content)"];

        if (message.role !== "assistant" || !message.sources || message.sources.items.length === 0) {
          return [...base, ""];
        }

        return [
          ...base,
          "Sources:",
          ...toSourceLines(message.sources),
          "",
        ];
      }),
    },
  ];

  return {
    title: session.title,
    metadataLines: [
      `Session ID: ${session.id}`,
      `Created: ${session.createdAt.toISOString()}`,
      `Updated: ${session.updatedAt.toISOString()}`,
      `Exported: ${new Date().toISOString()}`,
    ],
    sections,
  };
}

export async function buildContentItemExportDocument(
  input: BuildContentItemExportDocumentInput,
): Promise<ExportDocument | null> {
  const [item] = await db
    .select({
      id: contentItems.id,
      externalId: contentItems.externalId,
      contentType: contentItems.contentType,
      title: contentItems.title,
      channelName: contentItems.channelName,
      publishedAt: contentItems.publishedAt,
      status: contentItems.status,
      summary: contentItems.summary,
      keyInsights: contentItems.keyInsights,
      transcriptRaw: contentItems.transcriptRaw,
      createdAt: contentItems.createdAt,
      updatedAt: contentItems.updatedAt,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.id, input.contentItemId),
        eq(contentItems.userId, input.userId),
        eq(contentItems.libraryId, input.libraryId),
      ),
    )
    .limit(1);

  if (!item || item.status !== "ready") {
    return null;
  }

  if (!isContentType(item.contentType)) {
    return null;
  }

  const chunkRows = await db
    .select({
      chunkIndex: contentChunks.chunkIndex,
      chunkText: contentChunks.chunkText,
      startSeconds: contentChunks.startSeconds,
    })
    .from(contentChunks)
    .where(
      and(
        eq(contentChunks.contentItemId, item.id),
        eq(contentChunks.userId, input.userId),
        eq(contentChunks.libraryId, input.libraryId),
      ),
    )
    .orderBy(asc(contentChunks.chunkIndex));

  const transcriptSegments =
    parseTranscriptSegments(item.transcriptRaw) ??
    chunkRows
      .map((chunk) => ({
        startSeconds: chunk.startSeconds ?? null,
        text: chunk.chunkText,
      }))
      .filter((segment): segment is { startSeconds: number | null; text: string } =>
        typeof segment.text === "string" && segment.text.trim().length > 0,
      )
      .map((segment) => ({
        startSeconds: Math.max(0, Math.floor(segment.startSeconds ?? 0)),
        text: segment.text.trim(),
      }));

  const transcriptLines =
    transcriptSegments.length > 0
      ? transcriptSegments.map((segment) => `[${formatTimestamp(segment.startSeconds)}] ${segment.text}`)
      : ["Transcript is not available for this item."];

  const insightLines = item.keyInsights
    ? item.keyInsights
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : [];

  return {
    title: item.title,
    metadataLines: [
      `Content ID: ${item.id}`,
      `URL: ${buildItemUrl(item.externalId, item.contentType)}`,
      `Channel: ${item.channelName}`,
      `Published: ${item.publishedAt.toISOString()}`,
      `Created: ${item.createdAt.toISOString()}`,
      `Updated: ${item.updatedAt.toISOString()}`,
      `Exported: ${new Date().toISOString()}`,
    ],
    sections: [
      {
        heading: "Summary",
        lines: item.summary?.trim() ? [item.summary.trim()] : ["Summary is not available."],
      },
      {
        heading: "Key insights",
        lines: insightLines.length > 0 ? insightLines.map((line) => `- ${line}`) : ["No key insights available."],
      },
      {
        heading: "Transcript",
        lines: transcriptLines,
      },
    ],
  };
}

async function listAllChatMessages(userId: string, libraryId: string, sessionId: string) {
  const all: Array<Awaited<ReturnType<typeof listChatMessages>>["messages"][number]> = [];
  let cursor: Date | undefined;

  for (;;) {
    const page = await listChatMessages(userId, libraryId, sessionId, {
      limit: 100,
      cursor,
    });

    all.push(...page.messages);

    if (!page.nextCursor) {
      break;
    }

    cursor = new Date(page.nextCursor);
  }

  return all.sort((a, b) => {
    const byTime = a.createdAt.getTime() - b.createdAt.getTime();
    if (byTime !== 0) {
      return byTime;
    }

    return a.id.localeCompare(b.id);
  });
}

function toSourceLines(sources: ChatSourcesRollup): string[] {
  return sources.items.flatMap((item) => {
    const header = `- ${item.title}: ${item.url}`;
    const anchors = item.anchors.map((anchor) => {
      const label = anchor.label ?? anchor.anchorType;
      return `  - ${label}: ${anchor.url}`;
    });

    return [header, ...anchors];
  });
}

function parseTranscriptSegments(raw: string | null): TranscriptSegment[] | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const transcript = (parsed as { transcript?: unknown }).transcript;
  if (!Array.isArray(transcript)) {
    return null;
  }

  const segments = transcript
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const start = (row as { start?: unknown }).start;
      const text = (row as { text?: unknown }).text;

      if (typeof text !== "string" || text.trim().length === 0) {
        return null;
      }

      const startSeconds = typeof start === "number" && Number.isFinite(start)
        ? Math.max(0, Math.floor(start))
        : 0;

      return {
        startSeconds,
        text: text.trim(),
      } satisfies TranscriptSegment;
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));

  return segments.length > 0 ? segments : null;
}

function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
