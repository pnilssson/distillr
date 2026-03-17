import "server-only";

import {
  isContentType,
  isSourceType,
  type ContentType,
  type SourceType,
} from "@/lib/sources/types";

export type { ContentType, SourceType };

export type DiscoveredItem = {
  externalId: string;
  contentType: ContentType;
  title: string;
  thumbnailUrl: string;
  authorName: string;
  authorId: string;
  publishedAt: Date;
  durationSeconds: number;
};

export type DiscoveryResult = {
  items: DiscoveredItem[];
  sourceAuthorName: string | null;
  sourceTitle: string | null;
};

export type ContentSegment = {
  startSeconds: number | null;
  endSeconds: number | null;
  text: string;
};

export type FetchedContent = {
  title: string | null;
  segments: ContentSegment[];
  raw: unknown;
};

export interface ContentDiscovery {
  discover(url: string, sourceType: SourceType): Promise<DiscoveryResult>;
}

export interface ContentFetcher {
  fetch(externalId: string): Promise<FetchedContent>;
}

export class IngestionError extends Error {
  readonly terminal: boolean;

  constructor(message: string, terminal: boolean) {
    super(message);
    this.name = "IngestionError";
    this.terminal = terminal;
  }
}

export { isSourceType, isContentType };
