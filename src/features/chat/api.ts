import type { ChatMessageItem, ChatSessionListItem } from "@/features/chat/types";
import { getApiErrorMessage, parseJsonResponse } from "@/lib/http/response";

type FetchChatSessionsResponse = {
  sessions: ChatSessionListItem[];
};

type CreateChatSessionResponse = {
  session: Omit<ChatSessionListItem, "messageCount">;
};

type FetchChatMessagesResponse = {
  messages: ChatMessageItem[];
  nextCursor: string | null;
};

export async function fetchChatSessions(libraryId: string): Promise<ChatSessionListItem[]> {
  const response = await fetch(`/api/libraries/${libraryId}/chat/sessions`);

  const payload = await parseJsonResponse<FetchChatSessionsResponse | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not load chats. Please try again."));
  }

  if (!payload || !("sessions" in payload)) {
    throw new Error("Could not load chats. Please try again.");
  }

  return payload.sessions;
}

export async function createChatSession(libraryId: string): Promise<ChatSessionListItem> {
  const response = await fetch(`/api/libraries/${libraryId}/chat/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const payload = await parseJsonResponse<CreateChatSessionResponse | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not create chat. Please try again."));
  }

  if (!payload || !("session" in payload)) {
    throw new Error("Could not create chat. Please try again.");
  }

  return {
    ...payload.session,
    messageCount: 0,
  };
}

export async function fetchChatMessages(
  libraryId: string,
  sessionId: string,
): Promise<ChatMessageItem[]> {
  const response = await fetch(`/api/libraries/${libraryId}/chat/sessions/${sessionId}/messages?limit=50`);

  const payload = await parseJsonResponse<FetchChatMessagesResponse | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not load messages. Please try again."));
  }

  if (!payload || !("messages" in payload)) {
    throw new Error("Could not load messages. Please try again.");
  }

  return payload.messages;
}
