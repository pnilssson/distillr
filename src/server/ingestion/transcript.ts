import "server-only";

import { env } from "@/server/core/env";

const TRANSCRIPT_API_URL = "https://transcriptapi.com/api/v2/youtube/transcript";

type TranscriptApiSegment = {
  start?: number;
  text?: string;
};

type TranscriptApiResponse = {
  title?: string;
  duration?: string;
  segments?: TranscriptApiSegment[];
  error?: string;
  message?: string;
};

export type TranscriptSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type VideoTranscript = {
  title: string | null;
  duration: string | null;
  segments: TranscriptSegment[];
  raw: TranscriptApiResponse;
};

export class TranscriptUnavailableError extends Error {
  readonly terminal: boolean;

  constructor(message: string, terminal: boolean) {
    super(message);
    this.name = "TranscriptUnavailableError";
    this.terminal = terminal;
  }
}

export async function fetchTranscript(videoId: string): Promise<VideoTranscript> {
  if (!env.TRANSCRIPTAPI_API_KEY) {
    throw new Error("Missing TRANSCRIPTAPI_API_KEY environment variable.");
  }

  const url = new URL(TRANSCRIPT_API_URL);
  url.searchParams.set("video_url", `https://www.youtube.com/watch?v=${videoId}`);
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.TRANSCRIPTAPI_API_KEY}`,
    },
    signal: AbortSignal.timeout(20000),
  });

  const body = await parseJson(response);

  if (!response.ok) {
    const message = body?.error ?? body?.message ?? `Transcript API request failed (${response.status}).`;
    const normalizedMessage = message.toLowerCase();
    const terminal =
      response.status === 400 ||
      response.status === 404 ||
      normalizedMessage.includes("no caption") ||
      normalizedMessage.includes("no transcript") ||
      normalizedMessage.includes("captions are disabled") ||
      normalizedMessage.includes("transcript is disabled");

    throw new TranscriptUnavailableError(message, terminal);
  }

  const segments = normalizeSegments(body?.segments ?? []);

  if (segments.length === 0) {
    throw new TranscriptUnavailableError("No transcript segments were returned for this video.", true);
  }

  return {
    title: body?.title ?? null,
    duration: body?.duration ?? null,
    segments,
    raw: body ?? {},
  };
}

async function parseJson(response: Response): Promise<TranscriptApiResponse | null> {
  try {
    return (await response.json()) as TranscriptApiResponse;
  } catch {
    return null;
  }
}

function normalizeSegments(segments: TranscriptApiSegment[]): TranscriptSegment[] {
  const normalized = segments
    .map((segment) => {
      const startSeconds = Number(segment.start ?? 0);
      const text = (segment.text ?? "").trim().replace(/\s+/g, " ");

      if (!text) {
        return null;
      }

      return {
        startSeconds: Number.isFinite(startSeconds) ? startSeconds : 0,
        text,
      };
    })
    .filter((segment): segment is { startSeconds: number; text: string } => Boolean(segment))
    .sort((a, b) => a.startSeconds - b.startSeconds);

  return normalized.map((segment, index) => {
    const nextStart = normalized[index + 1]?.startSeconds;
    const fallbackEnd = segment.startSeconds + 4;
    const endSeconds =
      typeof nextStart === "number" && nextStart > segment.startSeconds
        ? nextStart
        : fallbackEnd;

    return {
      startSeconds: segment.startSeconds,
      endSeconds,
      text: segment.text,
    };
  });
}
