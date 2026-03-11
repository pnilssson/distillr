import "server-only";

import { getEncoding } from "js-tiktoken";

import type { TranscriptSegment } from "@/server/ingestion/transcript";

const encoder = getEncoding("cl100k_base");

const MAX_CHUNK_TOKENS = 400;
const OVERLAP_TOKENS = 60;

export type TranscriptChunk = {
  chunkIndex: number;
  chunkText: string;
  startSeconds: number;
  endSeconds: number;
  tokenCount: number;
};

export function chunkTranscriptSegments(segments: TranscriptSegment[]): {
  chunks: TranscriptChunk[];
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
      startSeconds: mergedSegments[0]?.startSeconds ?? 0,
      endSeconds: mergedSegments[mergedSegments.length - 1]?.endSeconds ?? 0,
      tokenCount: countTokens(chunkText),
    } satisfies TranscriptChunk;
  });

  const totalTokenCount = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);

  return { chunks, totalTokenCount };
}

function buildBaseChunks(segments: TranscriptSegment[]): TranscriptSegment[][] {
  const chunks: TranscriptSegment[][] = [];
  let currentChunk: TranscriptSegment[] = [];
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

function getTailOverlapSegments(previousChunk: TranscriptSegment[]): TranscriptSegment[] {
  const overlap: TranscriptSegment[] = [];
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
