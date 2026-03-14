import "server-only";

export type ChatMessageRole = "user" | "assistant";
export type ChatMessageStatus = "completed" | "aborted" | "failed";
export type ChatRequestMode = "auto" | "library" | "chat";
export type ChatEffectiveMode = "library" | "chat";

export type ChatUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type ChatSourceTimestamp = {
  seconds: number;
  label: string;
  url: string;
};

export type ChatSourceVideo = {
  videoId: string;
  youtubeVideoId: string;
  title: string;
  timestamps: ChatSourceTimestamp[];
};

export type ChatSourcesRollup = {
  videos: ChatSourceVideo[];
  extraVideos: number;
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
  youtubeVideoId: string;
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
  youtubeVideoId: string;
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
