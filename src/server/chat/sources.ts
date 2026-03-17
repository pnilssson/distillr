import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { contentChunkAnchors } from "@/db/schema";
import { isContentAnchorType } from "@/lib/sources/types";
import { buildAnchorUrl, buildItemUrl } from "@/lib/sources/url";
import type {
  ChatSourceAnchor,
  ChatSourceItem,
  ChatSourcesRollup,
  FusedEvidence,
} from "@/server/chat/types";

const MAX_ANCHORS_PER_ITEM = 5;

type BuildSourcesRollupParams = {
  userId: string;
  libraryId: string;
  evidence: FusedEvidence[];
};

type StoredChunkAnchor = {
  contentChunkId: string;
  anchorType: ChatSourceAnchor["anchorType"];
  label: string | null;
  urlFragment: string | null;
};

export async function buildSourcesRollup(params: BuildSourcesRollupParams): Promise<ChatSourcesRollup> {
  if (params.evidence.length === 0) {
    return {
      items: [],
    };
  }

  const chunkAnchors = await getChunkAnchors(params.userId, params.libraryId, params.evidence);
  const grouped = new Map<string, ChatSourceItem>();
  const anchorKeyByItem = new Map<string, Set<string>>();

  for (const item of params.evidence) {
    const existing = grouped.get(item.videoId);
    if (!existing) {
      grouped.set(item.videoId, {
        itemId: item.videoId,
        externalId: item.externalId,
        contentType: item.contentType,
        title: item.videoTitle,
        url: buildItemUrl(item.externalId, item.contentType),
        referenceCount: 1,
        anchors: [],
      });
    } else {
      existing.referenceCount += 1;
    }

    if (item.kind !== "chunk") {
      continue;
    }

    const sourceItem = grouped.get(item.videoId);
    if (!sourceItem) {
      continue;
    }

    const uniqueAnchorKeys = anchorKeyByItem.get(item.videoId) ?? new Set<string>();
    anchorKeyByItem.set(item.videoId, uniqueAnchorKeys);

    const anchorsForChunk = chunkAnchors.get(item.id) ?? [];
    for (const anchor of anchorsForChunk) {
      if (sourceItem.anchors.length >= MAX_ANCHORS_PER_ITEM) {
        break;
      }

      const anchorUrl = buildAnchorUrl(item.externalId, item.contentType, anchor.urlFragment);
      const dedupeKey = `${anchor.anchorType}:${anchorUrl}`;
      if (uniqueAnchorKeys.has(dedupeKey)) {
        continue;
      }

      sourceItem.anchors.push({
        anchorType: anchor.anchorType,
        label: anchor.label,
        url: anchorUrl,
      });
      uniqueAnchorKeys.add(dedupeKey);
    }
  }

  const items = [...grouped.values()].sort((a, b) => {
    if (b.referenceCount !== a.referenceCount) {
      return b.referenceCount - a.referenceCount;
    }

    return a.itemId.localeCompare(b.itemId);
  });

  return { items };
}

async function getChunkAnchors(
  userId: string,
  libraryId: string,
  evidence: FusedEvidence[],
): Promise<Map<string, StoredChunkAnchor[]>> {
  const chunkIds = [...new Set(evidence.filter((item) => item.kind === "chunk").map((item) => item.id))];

  if (chunkIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      contentChunkId: contentChunkAnchors.contentChunkId,
      anchorType: contentChunkAnchors.anchorType,
      label: contentChunkAnchors.label,
      urlFragment: contentChunkAnchors.urlFragment,
      startValue: contentChunkAnchors.startValue,
    })
    .from(contentChunkAnchors)
    .where(
      and(
        eq(contentChunkAnchors.userId, userId),
        eq(contentChunkAnchors.libraryId, libraryId),
        inArray(contentChunkAnchors.contentChunkId, chunkIds),
      ),
    );

  const sortedRows = [...rows].sort((a, b) => {
    const aStart = a.startValue ?? Number.POSITIVE_INFINITY;
    const bStart = b.startValue ?? Number.POSITIVE_INFINITY;
    return aStart - bStart;
  });

  const anchorsByChunk = new Map<string, StoredChunkAnchor[]>();
  for (const row of sortedRows) {
    if (!isAnchorType(row.anchorType)) {
      continue;
    }

    const existing = anchorsByChunk.get(row.contentChunkId) ?? [];
    existing.push({
      contentChunkId: row.contentChunkId,
      anchorType: row.anchorType,
      label: row.label,
      urlFragment: row.urlFragment,
    });
    anchorsByChunk.set(row.contentChunkId, existing);
  }

  return anchorsByChunk;
}

function isAnchorType(value: string): value is ChatSourceAnchor["anchorType"] {
  return isContentAnchorType(value);
}
