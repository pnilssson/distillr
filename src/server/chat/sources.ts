import "server-only";

import type { ChatSourceItem, ChatSourcesRollup, FusedEvidence } from "@/server/chat/types";

export function buildSourcesRollup(evidence: FusedEvidence[]): ChatSourcesRollup {
  if (evidence.length === 0) {
    return {
      items: [],
    };
  }

  const grouped = new Map<string, ChatSourceItem>();

  for (const item of evidence) {
    const existing = grouped.get(item.videoId);
    if (!existing) {
      grouped.set(item.videoId, {
        itemId: item.videoId,
        externalId: item.externalId,
        contentType: item.contentType,
        title: item.videoTitle,
        url: getItemUrl(item.externalId, item.contentType),
        referenceCount: 1,
      });
      continue;
    }

    existing.referenceCount += 1;
  }

  const items = [...grouped.values()].sort((a, b) => {
    if (b.referenceCount !== a.referenceCount) {
      return b.referenceCount - a.referenceCount;
    }

    return a.itemId.localeCompare(b.itemId);
  });

  return { items };
}

function getItemUrl(externalId: string, contentType: ChatSourceItem["contentType"]): string {
  if (contentType === "youtube_video") {
    return `https://youtube.com/watch?v=${encodeURIComponent(externalId)}`;
  }

  return externalId;
}
