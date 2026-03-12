export type VideoIngestionStatus = "pending" | "processing" | "ready" | "failed";

export type LibraryVideoProgressItem = {
  id: string;
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  status: VideoIngestionStatus;
  failureReason: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type LibraryVideosProgress = {
  videos: LibraryVideoProgressItem[];
  counts: {
    total: number;
    pending: number;
    processing: number;
    ready: number;
    failed: number;
  };
  hasInFlight: boolean;
  isProcessing: boolean;
  isSettled: boolean;
};
