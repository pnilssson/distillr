import type { SourceType } from "@/lib/sources/types";

export type SourceListItem = {
  id: string;
  url: string;
  sourceType: SourceType;
  status: "processing" | "ready" | "failed";
  channelName: string | null;
  title: string | null;
  autoSyncEnabled: boolean;
  nextSyncAt: string | null;
  lastCheckedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};
