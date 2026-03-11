import "server-only";

import { env } from "@/server/core/env";

const TRANSCRIPT_API_URL = "https://transcriptapi.com/api/v2/youtube/transcript";

type TranscriptApiSegment = {
  start?: number;
  duration?: number;
  text?: string;
};

type TranscriptApiErrorDetail = {
  message?: string;
};

type TranscriptApiMetadata = {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
};

type TranscriptApiResponse = {
  video_id?: string;
  language?: string;
  transcript?: TranscriptApiSegment[];
  metadata?: TranscriptApiMetadata;
  detail?: string | TranscriptApiErrorDetail;
  code?: string;
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
  url.searchParams.set("include_timestamp", "true");
  url.searchParams.set("send_metadata", "true");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.TRANSCRIPTAPI_API_KEY}`,
    },
    signal: AbortSignal.timeout(20000),
  });

  const body = await parseJson(response);

  if (!response.ok) {
    const message = getTranscriptErrorMessage(body, response.status);
    const normalizedMessage = message.toLowerCase();
    const terminal =
      response.status === 400 ||
      response.status === 401 ||
      response.status === 402 ||
      response.status === 404 ||
      response.status === 422 ||
      normalizedMessage.includes("no caption") ||
      normalizedMessage.includes("no transcript") ||
      normalizedMessage.includes("captions are disabled") ||
      normalizedMessage.includes("transcript is disabled");

    throw new TranscriptUnavailableError(message, terminal);
  }

  const segments = normalizeSegments(getTranscriptSegments(body));

  if (segments.length === 0) {
    throw new TranscriptUnavailableError("No transcript segments were returned for this video.", true);
  }

  return {
    title: body?.metadata?.title ?? null,
    duration: null,
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
      const durationSeconds = Number(segment.duration ?? 0);
      const text = (segment.text ?? "").trim().replace(/\s+/g, " ");

      if (!text) {
        return null;
      }

      return {
        startSeconds: Number.isFinite(startSeconds) ? startSeconds : 0,
        durationSeconds:
          Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : null,
        text,
      };
    })
    .filter(
      (
        segment,
      ): segment is { startSeconds: number; durationSeconds: number | null; text: string } =>
        Boolean(segment),
    )
    .sort((a, b) => a.startSeconds - b.startSeconds);

  return normalized.map((segment, index) => {
    const nextStart = normalized[index + 1]?.startSeconds;
    const durationEnd =
      typeof segment.durationSeconds === "number"
        ? segment.startSeconds + segment.durationSeconds
        : null;
    const fallbackEnd = segment.startSeconds + 4;
    let endSeconds = fallbackEnd;

    if (typeof durationEnd === "number" && durationEnd > segment.startSeconds) {
      endSeconds = durationEnd;
    }

    if (typeof nextStart === "number" && nextStart > segment.startSeconds) {
      endSeconds = Math.min(endSeconds, nextStart);
    }

    return {
      startSeconds: segment.startSeconds,
      endSeconds,
      text: segment.text,
    };
  });
}

function getTranscriptSegments(body: TranscriptApiResponse | null): TranscriptApiSegment[] {
  return Array.isArray(body?.transcript) ? body.transcript : [];
}

function getTranscriptErrorMessage(body: TranscriptApiResponse | null, status: number): string {
  const detail = body?.detail;

  if (typeof detail === "string" && detail.length > 0) {
    return detail;
  }

  if (
    detail &&
    typeof detail === "object" &&
    "message" in detail &&
    typeof detail.message === "string" &&
    detail.message.length > 0
  ) {
    return detail.message;
  }

  return `Transcript API request failed (${status}).`;
}
