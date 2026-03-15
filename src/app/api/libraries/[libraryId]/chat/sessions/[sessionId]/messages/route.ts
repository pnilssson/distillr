import { NextResponse } from "next/server";

import { listChatMessagesQuerySchema, sendChatMessageSchema } from "@/lib/validation/chat";
import { withApiAuth } from "@/server/core/auth/api";
import { getChatSessionById, listChatMessages } from "@/server/chat/queries";
import { streamChatMessage } from "@/server/chat/service";
import { getLibraryById } from "@/server/libraries/queries";

type ChatMessagesRouteProps = {
  params: Promise<{ libraryId: string; sessionId: string }>;
};

export const GET = withApiAuth<ChatMessagesRouteProps>(async (request, { params, user }) => {
  const { libraryId, sessionId } = await params;

  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  const session = await getChatSessionById(user.id, libraryId, sessionId);
  if (!session) {
    return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const parsedQuery = listChatMessagesQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const cursor = parsedQuery.data.cursor ? new Date(parsedQuery.data.cursor) : undefined;
  const result = await listChatMessages(user.id, libraryId, sessionId, {
    limit: parsedQuery.data.limit,
    cursor,
  });

  return NextResponse.json({
    messages: result.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      model: message.model,
      status: message.status,
      requestedMode: message.requestedMode,
      effectiveMode: message.effectiveMode,
      usage: message.usage,
      sources: message.sources,
    })),
    nextCursor: result.nextCursor,
  });
});

export const POST = withApiAuth<ChatMessagesRouteProps>(async (request, { params, user }) => {
  const { libraryId, sessionId } = await params;

  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsedBody = sendChatMessageSchema.safeParse(payload);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  return streamChatMessage({
    userId: user.id,
    userEmail: user.email ?? null,
    userName: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    libraryId,
    sessionId,
    content: parsedBody.data.content,
    mode: parsedBody.data.mode,
    abortSignal: request.signal,
  });
});
