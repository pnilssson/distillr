export type SourceListItem = {
  id: string;
  url: string;
  sourceType: "video" | "playlist" | "channel";
  channelName: string | null;
  title: string | null;
  createdAt: string;
};
