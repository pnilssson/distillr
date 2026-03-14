import { NextResponse } from "next/server";

import { createChatSessionSchema } from "@/lib/validation/chat";
import { withApiAuth } from "@/server/core/auth/api";
import {
  createChatSession,
  listChatSessions,
} from "@/server/chat/queries";
import { getLibraryById } from "@/server/libraries/queries";

type ChatSessionsRouteProps = {
  params: Promise<{ libraryId: string }>;
};

export const GET = withApiAuth<ChatSessionsRouteProps>(async (_request, { params, user }) => {
  const { libraryId } = await params;

  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  const sessions = await listChatSessions(user.id, libraryId);

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      lastMessageAt: session.lastMessageAt ? session.lastMessageAt.toISOString() : null,
      messageCount: session.messageCount,
    })),
  });
});

export const POST = withApiAuth<ChatSessionsRouteProps>(async (request, { params, user }) => {
  const { libraryId } = await params;

  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const parsed = createChatSessionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const session = await createChatSession(user.id, libraryId);
  if (!session) {
    return NextResponse.json({ error: "Could not create chat session." }, { status: 500 });
  }

  return NextResponse.json(
    {
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        lastMessageAt: session.lastMessageAt ? session.lastMessageAt.toISOString() : null,
      },
    },
    { status: 201 },
  );
});
