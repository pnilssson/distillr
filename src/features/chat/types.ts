import type { ContentAnchorType, ContentType } from "@/lib/sources/types";

export type ChatSessionListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
};

export type ChatMessageSourceItem = {
  itemId: string;
  externalId: string;
  contentType: ContentType;
  title: string;
  url: string;
  referenceCount: number;
  anchors: Array<{
    anchorType: ContentAnchorType;
    label: string | null;
    url: string;
  }>;
};

export type ChatMessageSources = {
  items: ChatMessageSourceItem[];
};

export type ChatMessageItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  model: string | null;
  status: "completed" | "aborted" | "failed";
  requestedMode: "auto" | "library" | "chat" | null;
  effectiveMode: "library" | "chat" | null;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
  sources: ChatMessageSources | null;
};

export type ChatMessageMetadata = {
  sources?: ChatMessageSources;
  status?: "completed" | "aborted" | "failed";
  effectiveMode?: "library" | "chat";
};

export type ChatRequestMode = "auto" | "library" | "chat";

export type { ChatModelId } from "@/lib/chat-models";
