import "server-only";

import {
  type ContentDiscovery,
  type ContentFetcher,
  type ContentType,
  type SourceType,
} from "@/server/ingestion/providers/types";
import { youtubeDiscovery, youtubeFetcher } from "@/server/ingestion/providers/youtube";

export function getDiscovery(sourceType: SourceType): ContentDiscovery {
  switch (sourceType) {
    case "youtube_video":
    case "youtube_playlist":
    case "youtube_channel":
      return youtubeDiscovery;
    default: {
      const exhaustiveCheck: never = sourceType;
      throw new Error(`No discovery provider registered for source type: ${exhaustiveCheck}`);
    }
  }
}

export function getFetcher(contentType: ContentType): ContentFetcher {
  switch (contentType) {
    case "youtube_video":
      return youtubeFetcher;
    default: {
      const exhaustiveCheck: never = contentType;
      throw new Error(`No fetch provider registered for content type: ${exhaustiveCheck}`);
    }
  }
}
