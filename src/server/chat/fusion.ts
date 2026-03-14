import "server-only";

import type { FusedEvidence, RetrievalCandidate } from "@/server/chat/types";

const FTS_NORMALIZATION_DIVISOR = 0.4;

const CHUNK_VECTOR_WEIGHT = 0.45;
const INSIGHT_VECTOR_WEIGHT = 0.35;
const FTS_WEIGHT = 0.2;

const MAX_EVIDENCE_ITEMS = 24;
const MAX_CHUNKS_PER_VIDEO = 4;
const WEAK_EVIDENCE_THRESHOLD = 0.3;

type FusionResult = {
  evidence: FusedEvidence[];
  topScore: number;
  isWeakEvidence: boolean;
};

type AggregatedEvidence = {
  id: string;
  kind: "chunk" | "insight";
  videoId: string;
  youtubeVideoId: string;
  videoTitle: string;
  text: string;
  insightType: string | null;
  startSeconds: number | null;
  endSeconds: number | null;
  chunkVectorRaw: number | null;
  insightVectorRaw: number | null;
  ftsRaw: number | null;
};

export function fuseRetrievalCandidates(candidates: RetrievalCandidate[]): FusionResult {
  if (candidates.length === 0) {
    return {
      evidence: [],
      topScore: 0,
      isWeakEvidence: true,
    };
  }

  const aggregated = new Map<string, AggregatedEvidence>();

  for (const candidate of candidates) {
    const key = candidateKey(candidate);
    const existing = aggregated.get(key);

    if (!existing) {
      aggregated.set(key, {
        id: candidate.id,
        kind: candidate.startSeconds === null ? "insight" : "chunk",
        videoId: candidate.videoId,
        youtubeVideoId: candidate.youtubeVideoId,
        videoTitle: candidate.videoTitle,
        text: candidate.text,
        insightType: candidate.insightType,
        startSeconds: candidate.startSeconds,
        endSeconds: candidate.endSeconds,
        chunkVectorRaw: candidate.channel === "chunk_vector" ? candidate.rawScore : null,
        insightVectorRaw: candidate.channel === "insight_vector" ? candidate.rawScore : null,
        ftsRaw: candidate.channel === "chunk_fts" ? candidate.rawScore : null,
      });
      continue;
    }

    if (candidate.channel === "chunk_vector") {
      existing.chunkVectorRaw = minDefined(existing.chunkVectorRaw, candidate.rawScore);
      continue;
    }

    if (candidate.channel === "insight_vector") {
      existing.insightVectorRaw = minDefined(existing.insightVectorRaw, candidate.rawScore);
      continue;
    }

    existing.ftsRaw = maxDefined(existing.ftsRaw, candidate.rawScore);
  }

  const ranked = [...aggregated.values()]
    .map((item) => {
      const chunkVectorScore =
        item.chunkVectorRaw === null ? 0 : clamp(1 - item.chunkVectorRaw, 0, 1);
      const insightVectorScore =
        item.insightVectorRaw === null ? 0 : clamp(1 - item.insightVectorRaw, 0, 1);
      const ftsScore = item.ftsRaw === null ? 0 : clamp(item.ftsRaw / FTS_NORMALIZATION_DIVISOR, 0, 1);

      const fusedScore =
        CHUNK_VECTOR_WEIGHT * chunkVectorScore +
        INSIGHT_VECTOR_WEIGHT * insightVectorScore +
        FTS_WEIGHT * ftsScore;

      return {
        id: item.id,
        kind: item.kind,
        videoId: item.videoId,
        youtubeVideoId: item.youtubeVideoId,
        videoTitle: item.videoTitle,
        text: item.text,
        insightType: item.insightType,
        startSeconds: item.startSeconds,
        endSeconds: item.endSeconds,
        fusedScore,
        chunkVectorScore,
        insightVectorScore,
        ftsScore,
      } satisfies FusedEvidence;
    })
    .sort((a, b) => {
      if (b.fusedScore !== a.fusedScore) {
        return b.fusedScore - a.fusedScore;
      }

      if (a.videoId !== b.videoId) {
        return a.videoId.localeCompare(b.videoId);
      }

      if (a.startSeconds !== b.startSeconds) {
        return (a.startSeconds ?? Number.MAX_SAFE_INTEGER) - (b.startSeconds ?? Number.MAX_SAFE_INTEGER);
      }

      return a.id.localeCompare(b.id);
    });

  const selected: FusedEvidence[] = [];
  const chunkCountsByVideo = new Map<string, number>();

  for (const item of ranked) {
    if (selected.length >= MAX_EVIDENCE_ITEMS) {
      break;
    }

    if (item.kind === "chunk") {
      const currentCount = chunkCountsByVideo.get(item.videoId) ?? 0;
      if (currentCount >= MAX_CHUNKS_PER_VIDEO) {
        continue;
      }

      chunkCountsByVideo.set(item.videoId, currentCount + 1);
    }

    selected.push(item);
  }

  const topScore = selected[0]?.fusedScore ?? 0;

  return {
    evidence: selected,
    topScore,
    isWeakEvidence: topScore < WEAK_EVIDENCE_THRESHOLD,
  };
}

function candidateKey(candidate: RetrievalCandidate): string {
  const normalizedText = normalizeText(candidate.text);

  if (candidate.startSeconds !== null) {
    return `${candidate.videoId}:chunk:${Math.floor(candidate.startSeconds)}:${normalizedText}`;
  }

  return `${candidate.videoId}:insight:${candidate.insightType ?? "unknown"}:${normalizedText}`;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 220);
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function minDefined(current: number | null, next: number): number {
  if (current === null) {
    return next;
  }

  return Math.min(current, next);
}

function maxDefined(current: number | null, next: number): number {
  if (current === null) {
    return next;
  }

  return Math.max(current, next);
}
