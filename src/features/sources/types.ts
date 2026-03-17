import type { SourceType } from "@/lib/sources/types";

export type SourceListItem = {
  id: string;
  url: string;
  sourceType: SourceType;
  status: "processing" | "ready" | "failed";
  channelName: string | null;
  title: string | null;
  createdAt: string;
};
