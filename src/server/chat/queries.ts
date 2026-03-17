import "server-only";

import { and, desc, eq, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { chatMessages, chatSessions } from "@/db/schema";
import { isContentAnchorType, isContentType } from "@/lib/sources/types";
import type {
  ChatEffectiveMode,
  ChatMessageListItem,
  ChatMessageRole,
  ChatRequestMode,
  ChatMessageStatus,
  ChatSessionListItem,
  ChatSourcesRollup,
} from "@/server/chat/types";

type ListChatMessagesOptions = {
  limit: number;
  cursor?: Date;
};

type InsertAssistantMessageInput = {
  userId: string;
  libraryId: string;
  sessionId: string;
  content: string;
  model: string;
  status: ChatMessageStatus;
  effectiveMode: ChatEffectiveMode;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  sources: ChatSourcesRollup | null;
  evidence: unknown;
};

export async function listChatSessions(
  userId: string,
  libraryId: string,
): Promise<ChatSessionListItem[]> {
  const rows = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
      lastMessageAt: chatSessions.lastMessageAt,
      messageCount: sql<number>`count(${chatMessages.id})`,
    })
    .from(chatSessions)
    .leftJoin(chatMessages, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(eq(chatSessions.userId, userId), eq(chatSessions.libraryId, libraryId)))
    .groupBy(
      chatSessions.id,
      chatSessions.title,
      chatSessions.createdAt,
      chatSessions.updatedAt,
      chatSessions.lastMessageAt,
    )
    .orderBy(desc(chatSessions.lastMessageAt), desc(chatSessions.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastMessageAt: row.lastMessageAt,
    messageCount: Number(row.messageCount ?? 0),
  }));
}

export async function createChatSession(userId: string, libraryId: string): Promise<ChatSessionListItem | null> {
  const [session] = await db
    .insert(chatSessions)
    .values({ userId, libraryId })
    .returning({
      id: chatSessions.id,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
      lastMessageAt: chatSessions.lastMessageAt,
    });

  if (!session) {
    return null;
  }

  return {
    ...session,
    messageCount: 0,
  };
}

export async function getChatSessionById(userId: string, libraryId: string, sessionId: string) {
  const [session] = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
      lastMessageAt: chatSessions.lastMessageAt,
    })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, userId),
        eq(chatSessions.libraryId, libraryId),
      ),
    );

  return session ?? null;
}

export async function deleteChatSession(
  userId: string,
  libraryId: string,
  sessionId: string,
): Promise<boolean> {
  const [deletedSession] = await db
    .delete(chatSessions)
    .where(
      and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, userId),
        eq(chatSessions.libraryId, libraryId),
      ),
    )
    .returning({ id: chatSessions.id });

  return Boolean(deletedSession);
}

export async function listChatMessages(
  userId: string,
  libraryId: string,
  sessionId: string,
  options: ListChatMessagesOptions,
): Promise<{ messages: ChatMessageListItem[]; nextCursor: string | null }> {
  const predicates = [
    eq(chatMessages.userId, userId),
    eq(chatMessages.libraryId, libraryId),
    eq(chatMessages.sessionId, sessionId),
  ];

  if (options.cursor) {
    predicates.push(lt(chatMessages.createdAt, options.cursor));
  }

  const rows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
      model: chatMessages.model,
      status: chatMessages.status,
      requestedMode: chatMessages.requestedMode,
      effectiveMode: chatMessages.effectiveMode,
      inputTokens: chatMessages.inputTokens,
      outputTokens: chatMessages.outputTokens,
      totalTokens: chatMessages.totalTokens,
      sourcesJson: chatMessages.sourcesJson,
    })
    .from(chatMessages)
    .where(and(...predicates))
    .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
    .limit(options.limit + 1);

  const hasMore = rows.length > options.limit;
  const pageRows = hasMore ? rows.slice(0, options.limit) : rows;
  const nextCursor = hasMore ? (pageRows[pageRows.length - 1]?.createdAt.toISOString() ?? null) : null;

  const messages = pageRows.reverse().map((row) => {
    const usage =
      row.inputTokens !== null && row.outputTokens !== null && row.totalTokens !== null
        ? {
            inputTokens: row.inputTokens,
            outputTokens: row.outputTokens,
            totalTokens: row.totalTokens,
          }
        : null;

    return {
      id: row.id,
      role: normalizeRole(row.role),
      content: row.content,
      createdAt: row.createdAt,
      model: row.model,
      status: normalizeStatus(row.status),
      requestedMode: normalizeRequestedMode(row.requestedMode),
      effectiveMode: normalizeEffectiveMode(row.effectiveMode),
      usage,
      sources: toSourcesRollup(row.sourcesJson),
    } satisfies ChatMessageListItem;
  });

  return {
    messages,
    nextCursor,
  };
}

export async function insertUserMessage(params: {
  userId: string;
  libraryId: string;
  sessionId: string;
  content: string;
  requestedMode: ChatRequestMode;
}) {
  const [message] = await db
    .insert(chatMessages)
    .values({
      userId: params.userId,
      libraryId: params.libraryId,
      sessionId: params.sessionId,
      role: "user",
      content: params.content,
      status: "completed",
      requestedMode: params.requestedMode,
    })
    .returning({
      id: chatMessages.id,
      createdAt: chatMessages.createdAt,
    });

  return message ?? null;
}

export async function insertAssistantMessage(params: InsertAssistantMessageInput) {
  const [message] = await db
    .insert(chatMessages)
    .values({
      userId: params.userId,
      libraryId: params.libraryId,
      sessionId: params.sessionId,
      role: "assistant",
      content: params.content,
      model: params.model,
      status: params.status,
      effectiveMode: params.effectiveMode,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.totalTokens,
      sourcesJson: params.sources,
      evidenceJson: params.evidence,
    })
    .returning({
      id: chatMessages.id,
      createdAt: chatMessages.createdAt,
    });

  return message ?? null;
}

export async function updateSessionAfterMessage(
  userId: string,
  libraryId: string,
  sessionId: string,
  title: string | undefined,
  lastMessageAt: Date,
) {
  const values: {
    title?: string;
    lastMessageAt: Date;
    updatedAt: ReturnType<typeof sql>;
  } = {
    lastMessageAt,
    updatedAt: sql`now()`,
  };

  if (title) {
    values.title = title;
  }
  await db
    .update(chatSessions)
    .set(values)
    .where(
      and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, userId),
        eq(chatSessions.libraryId, libraryId),
      ),
    );
}

function normalizeRole(role: string): ChatMessageRole {
  if (role === "assistant") {
    return "assistant";
  }

  return "user";
}

function normalizeStatus(status: string): ChatMessageStatus {
  if (status === "aborted" || status === "failed" || status === "completed") {
    return status;
  }

  return "completed";
}

function normalizeRequestedMode(mode: string | null): ChatRequestMode | null {
  if (mode === "auto" || mode === "library" || mode === "chat") {
    return mode;
  }

  return null;
}

function normalizeEffectiveMode(mode: string | null): ChatEffectiveMode | null {
  if (mode === "library" || mode === "chat") {
    return mode;
  }

  return null;
}

function toSourcesRollup(value: unknown): ChatSourcesRollup | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    items?: unknown;
  };

  if (!Array.isArray(candidate.items)) {
    return null;
  }

  const items = candidate.items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as {
        itemId?: unknown;
        externalId?: unknown;
        contentType?: unknown;
        title?: unknown;
        url?: unknown;
        referenceCount?: unknown;
        anchors?: unknown;
      };

      if (
        typeof row.itemId !== "string" ||
        typeof row.externalId !== "string" ||
        typeof row.contentType !== "string" ||
        !isContentType(row.contentType) ||
        typeof row.title !== "string" ||
        typeof row.url !== "string" ||
        typeof row.referenceCount !== "number"
      ) {
        return null;
      }

      const anchors = Array.isArray(row.anchors)
        ? row.anchors
            .map((anchor) => {
              if (!anchor || typeof anchor !== "object") {
                return null;
              }

              const value = anchor as {
                anchorType?: unknown;
                label?: unknown;
                url?: unknown;
              };

              if (
                typeof value.anchorType !== "string" ||
                !isContentAnchorType(value.anchorType) ||
                (value.label !== null && typeof value.label !== "string") ||
                typeof value.url !== "string"
              ) {
                return null;
              }

              return {
                anchorType: value.anchorType,
                label: value.label,
                url: value.url,
              };
            })
            .filter((anchor): anchor is ChatSourcesRollup["items"][number]["anchors"][number] => Boolean(anchor))
        : [];

      return {
        itemId: row.itemId,
        externalId: row.externalId,
        contentType: row.contentType,
        title: row.title,
        url: row.url,
        referenceCount: row.referenceCount,
        anchors,
      };
    })
    .filter((item): item is ChatSourcesRollup["items"][number] => Boolean(item));

  return {
    items,
  };
}
