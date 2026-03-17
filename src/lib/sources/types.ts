export const SOURCE_TYPES = ["youtube_video", "youtube_playlist", "youtube_channel"] as const;

export const CONTENT_TYPES = ["youtube_video"] as const;

export const CONTENT_ANCHOR_TYPES = ["timecode", "page", "section", "char_range"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export type ContentType = (typeof CONTENT_TYPES)[number];

export type ContentAnchorType = (typeof CONTENT_ANCHOR_TYPES)[number];

export function isSourceType(value: string): value is SourceType {
  return SOURCE_TYPES.includes(value as SourceType);
}

export function isContentType(value: string): value is ContentType {
  return CONTENT_TYPES.includes(value as ContentType);
}

export function isContentAnchorType(value: string): value is ContentAnchorType {
  return CONTENT_ANCHOR_TYPES.includes(value as ContentAnchorType);
}
