import type { SourceListItem } from "./types";

export function getSourceLabel(source: SourceListItem): string {
  if (source.channelName && source.title) {
    return `${source.channelName} - ${source.title}`;
  }

  if (source.channelName) {
    return source.channelName;
  }

  return source.url;
}
