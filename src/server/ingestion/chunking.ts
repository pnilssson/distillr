import "server-only";

import { getEncoding } from "js-tiktoken";

import type { ContentAnchor, ContentSegment } from "@/server/ingestion/providers/types";

const encoder = getEncoding("cl100k_base");

const MAX_CHUNK_TOKENS = 400;
const OVERLAP_TOKENS = 60;

export type ContentChunk = {
  chunkIndex: number;
  chunkText: string;
  startSeconds: number | null;
  endSeconds: number | null;
  anchors: ContentAnchor[];
  tokenCount: number;
};

export function chunkContentSegments(segments: ContentSegment[]): {
  chunks: ContentChunk[];
  totalTokenCount: number;
} {
  if (segments.length === 0) {
    return { chunks: [], totalTokenCount: 0 };
  }

  const baseChunks = buildBaseChunks(segments);

  const chunks = baseChunks.map((baseChunk, chunkIndex) => {
    const overlapSegments = chunkIndex === 0 ? [] : getTailOverlapSegments(baseChunks[chunkIndex - 1]);
    const mergedSegments = [...overlapSegments, ...baseChunk];
    const chunkText = mergedSegments.map((segment) => segment.text).join(" ");

    return {
      chunkIndex,
      chunkText,
      startSeconds: mergedSegments[0]?.startSeconds ?? null,
      endSeconds: mergedSegments[mergedSegments.length - 1]?.endSeconds ?? null,
      anchors: collectChunkAnchors(mergedSegments),
      tokenCount: countTokens(chunkText),
    } satisfies ContentChunk;
  });

  const totalTokenCount = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);

  return { chunks, totalTokenCount };
}

function buildBaseChunks(segments: ContentSegment[]): ContentSegment[][] {
  const chunks: ContentSegment[][] = [];
  let currentChunk: ContentSegment[] = [];
  let currentTokenCount = 0;

  for (const segment of segments) {
    const segmentTokenCount = countTokens(segment.text);

    if (currentChunk.length > 0 && currentTokenCount + segmentTokenCount > MAX_CHUNK_TOKENS) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokenCount = 0;
    }

    currentChunk.push(segment);
    currentTokenCount += segmentTokenCount;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function getTailOverlapSegments(previousChunk: ContentSegment[]): ContentSegment[] {
  const overlap: ContentSegment[] = [];
  let tokenCount = 0;

  for (let i = previousChunk.length - 1; i >= 0; i -= 1) {
    const segment = previousChunk[i];
    const segmentTokenCount = countTokens(segment.text);

    overlap.unshift(segment);
    tokenCount += segmentTokenCount;

    if (tokenCount >= OVERLAP_TOKENS) {
      break;
    }
  }

  return overlap;
}

function countTokens(text: string): number {
  return encoder.encode(text).length;
}

function collectChunkAnchors(segments: ContentSegment[]): ContentAnchor[] {
  const deduped = new Map<string, ContentAnchor>();

  for (const segment of segments) {
    for (const anchor of segment.anchors) {
      const key = `${anchor.anchorType}:${anchor.anchorKey}`;
      if (!deduped.has(key)) {
        deduped.set(key, anchor);
      }
    }
  }

  return [...deduped.values()];
}
