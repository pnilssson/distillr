import { NextResponse } from "next/server";

import { deleteChatSession } from "@/server/chat/queries";
import { withApiAuth } from "@/server/core/auth/api";
import { getLibraryById } from "@/server/libraries/queries";

type ChatSessionRouteProps = {
  params: Promise<{ libraryId: string; sessionId: string }>;
};

export const DELETE = withApiAuth<ChatSessionRouteProps>(async (_request, { params, user }) => {
  const { libraryId, sessionId } = await params;

  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  const deleted = await deleteChatSession(user.id, libraryId, sessionId);
  if (!deleted) {
    return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
