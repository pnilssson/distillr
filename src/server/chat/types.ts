import "server-only";

import type { ContentAnchorType, ContentType } from "@/lib/sources/types";

export type ChatMessageRole = "user" | "assistant";
export type ChatMessageStatus = "completed" | "aborted" | "failed";
export type ChatRequestMode = "auto" | "library" | "chat";
export type ChatEffectiveMode = "library" | "chat";

export type ChatUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type ChatSourceAnchor = {
  anchorType: ContentAnchorType;
  label: string | null;
  url: string;
};

export type ChatSourceItem = {
  itemId: string;
  externalId: string;
  contentType: ContentType;
  title: string;
  url: string;
  referenceCount: number;
  anchors: ChatSourceAnchor[];
};

export type ChatSourcesRollup = {
  items: ChatSourceItem[];
};

export type ChatSessionListItem = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  messageCount: number;
};

export type ChatMessageListItem = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: Date;
  model: string | null;
  status: ChatMessageStatus;
  requestedMode: ChatRequestMode | null;
  effectiveMode: ChatEffectiveMode | null;
  usage: ChatUsage | null;
  sources: ChatSourcesRollup | null;
};

export type RetrievalChannel = "chunk_vector" | "insight_vector" | "chunk_fts";

export type RetrievalCandidate = {
  id: string;
  channel: RetrievalChannel;
  rawScore: number;
  videoId: string;
  externalId: string;
  contentType: ContentType;
  videoTitle: string;
  text: string;
  insightType: string | null;
  startSeconds: number | null;
  endSeconds: number | null;
};

export type FusedEvidence = {
  id: string;
  kind: "chunk" | "insight";
  videoId: string;
  externalId: string;
  contentType: ContentType;
  videoTitle: string;
  text: string;
  insightType: string | null;
  startSeconds: number | null;
  endSeconds: number | null;
  fusedScore: number;
  chunkVectorScore: number;
  insightVectorScore: number;
  ftsScore: number;
};
