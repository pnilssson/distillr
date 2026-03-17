export type ChatSessionListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
};

export type ChatMessageSource = {
  videoId: string;
  youtubeVideoId: string;
  title: string;
  timestamps: { seconds: number; label: string; url: string }[];
};

export type ChatMessageSources = {
  videos: ChatMessageSource[];
  extraVideos: number;
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
