export type SourceListItem = {
  id: string;
  url: string;
  sourceType: "video" | "playlist" | "channel";
  status: "processing" | "ready" | "failed";
  channelName: string | null;
  title: string | null;
  createdAt: string;
};
