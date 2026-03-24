import "server-only";

import {
  isContentType,
  isSourceType,
  type ContentAnchorType,
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

export type IncrementalDiscoveryResult = DiscoveryResult & {
  nextCursor: Record<string, unknown> | null;
};

export type IncrementalDiscoveryParams = {
  url: string;
  sourceType: SourceType;
  cursor: Record<string, unknown> | null;
};

export type ContentAnchor = {
  anchorKey: string;
  anchorType: ContentAnchorType;
  startValue: number | null;
  endValue: number | null;
  label: string | null;
  urlFragment: string | null;
  metadata: Record<string, unknown> | null;
};

export type ContentSegment = {
  startSeconds: number | null;
  endSeconds: number | null;
  text: string;
  anchors: ContentAnchor[];
};

export type FetchedContent = {
  title: string | null;
  segments: ContentSegment[];
  raw: unknown;
};

export interface ContentDiscovery {
  discover(url: string, sourceType: SourceType): Promise<DiscoveryResult>;
  discoverIncremental?(input: IncrementalDiscoveryParams): Promise<IncrementalDiscoveryResult>;
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
