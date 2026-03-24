import "server-only";

import { env } from "@/server/core/env";
import {
  IngestionError,
  type ContentAnchor,
  type ContentDiscovery,
  type ContentFetcher,
  type ContentSegment,
  type DiscoveryResult,
  type DiscoveredItem,
  type FetchedContent,
  type IncrementalDiscoveryParams,
  type IncrementalDiscoveryResult,
  type SourceType,
} from "@/server/ingestion/providers/types";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_MAX_PAGE_SIZE = 50;
const YOUTUBE_VIDEO_BATCH_SIZE = 50;
const MAX_PLAYLIST_VIDEOS = 1000;
const MAX_PLAYLIST_PAGES = 20;
const SYNC_OVERLAP_VIDEOS = 12;
const TRANSCRIPT_API_URL = "https://transcriptapi.com/api/v2/youtube/transcript";

type YoutubePlaylistItemsResponse = {
  items?: Array<{
    contentDetails?: {
      videoId?: string;
    };
  }>;
  nextPageToken?: string;
};

type YoutubeVideosResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      channelId?: string;
      publishedAt?: string;
      thumbnails?: {
        maxres?: { url?: string };
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
    contentDetails?: {
      duration?: string;
    };
  }>;
};

type YoutubeChannelsResponse = {
  items?: Array<{
    id?: string;
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
};

type YoutubePlaylistsResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      channelTitle?: string;
    };
  }>;
};

type YoutubeApiErrorResponse = {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{
      message?: string;
      reason?: string;
    }>;
  };
};

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
};

type TranscriptApiResponse = {
  transcript?: TranscriptApiSegment[];
  metadata?: TranscriptApiMetadata;
  detail?: string | TranscriptApiErrorDetail;
};

export class YouTubeDiscoveryError extends IngestionError {
  constructor(message: string, terminal: boolean) {
    super(message, terminal);
    this.name = "YouTubeDiscoveryError";
  }
}

export class TranscriptUnavailableError extends IngestionError {
  constructor(message: string, terminal: boolean) {
    super(message, terminal);
    this.name = "TranscriptUnavailableError";
  }
}

export const youtubeDiscovery: ContentDiscovery = {
  async discover(url, sourceType) {
    return discoverFromYouTube(url, sourceType);
  },
  async discoverIncremental(input) {
    return discoverIncrementalFromYouTube(input);
  },
};

export const youtubeFetcher: ContentFetcher = {
  async fetch(externalId) {
    return fetchYouTubeContent(externalId);
  },
};

async function discoverFromYouTube(url: string, sourceType: SourceType): Promise<DiscoveryResult> {
  const playlistMetadata =
    sourceType === "youtube_playlist" ? await fetchPlaylistMetadata(extractPlaylistId(url)) : null;

  const externalIds = await discoverExternalIds(url, sourceType);

  if (externalIds.length === 0) {
    return {
      items: [],
      sourceAuthorName: playlistMetadata?.authorName ?? null,
      sourceTitle: sourceType === "youtube_playlist" ? playlistMetadata?.title ?? null : null,
    };
  }

  const items = await fetchVideoMetadata(externalIds);
  const primaryItem = items[0] ?? null;

  if (sourceType === "youtube_video") {
    return {
      items,
      sourceAuthorName: primaryItem?.authorName ?? null,
      sourceTitle: primaryItem?.title ?? null,
    };
  }

  if (sourceType === "youtube_playlist") {
    return {
      items,
      sourceAuthorName: playlistMetadata?.authorName ?? primaryItem?.authorName ?? null,
      sourceTitle: playlistMetadata?.title ?? null,
    };
  }

  return {
    items,
    sourceAuthorName: primaryItem?.authorName ?? null,
    sourceTitle: null,
  };
}

type PlaylistIncrementalResult = {
  ids: string[];
  headExternalId: string | null;
};

type YouTubeSyncCursor =
  | {
      kind: "youtube_playlist";
      playlistId: string;
      headExternalId: string | null;
    }
  | {
      kind: "youtube_channel";
      uploadsPlaylistId: string;
      headExternalId: string | null;
    };

async function discoverIncrementalFromYouTube(
  input: IncrementalDiscoveryParams,
): Promise<IncrementalDiscoveryResult> {
  const { url, sourceType, cursor } = input;

  if (sourceType === "youtube_video") {
    const full = await discoverFromYouTube(url, sourceType);
    return {
      ...full,
      nextCursor: null,
    };
  }

  if (sourceType === "youtube_playlist") {
    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      throw new YouTubeDiscoveryError("Could not parse YouTube playlist ID from URL.", true);
    }

    const parsedCursor = parseYouTubeSyncCursor(cursor, sourceType);
    const incremental = await fetchPlaylistVideoIdsIncremental(
      playlistId,
      parsedCursor?.headExternalId ?? null,
    );
    const playlistMetadata = await fetchPlaylistMetadata(playlistId);
    const items = incremental.ids.length > 0 ? await fetchVideoMetadata(incremental.ids) : [];

    return {
      items,
      sourceAuthorName: playlistMetadata?.authorName ?? items[0]?.authorName ?? null,
      sourceTitle: playlistMetadata?.title ?? null,
      nextCursor: {
        kind: "youtube_playlist",
        playlistId,
        headExternalId: incremental.headExternalId,
      },
    };
  }

  if (sourceType === "youtube_channel") {
    const parsedCursor = parseYouTubeSyncCursor(cursor, sourceType);
    const cursorUploadsPlaylistId =
      parsedCursor?.kind === "youtube_channel" ? parsedCursor.uploadsPlaylistId : null;
    const cursorHeadExternalId =
      parsedCursor?.kind === "youtube_channel" ? parsedCursor.headExternalId : null;
    const uploadsPlaylistId =
      cursorUploadsPlaylistId ?? (await resolveUploadsPlaylistId(url));

    if (!uploadsPlaylistId) {
      throw new YouTubeDiscoveryError("Could not resolve YouTube channel uploads playlist.", true);
    }

    const incremental = await fetchPlaylistVideoIdsIncremental(
      uploadsPlaylistId,
      cursorHeadExternalId,
    );
    const items = incremental.ids.length > 0 ? await fetchVideoMetadata(incremental.ids) : [];

    return {
      items,
      sourceAuthorName: items[0]?.authorName ?? null,
      sourceTitle: null,
      nextCursor: {
        kind: "youtube_channel",
        uploadsPlaylistId,
        headExternalId: incremental.headExternalId,
      },
    };
  }

  const exhaustiveCheck: never = sourceType;
  throw new YouTubeDiscoveryError(`Unsupported source type: ${exhaustiveCheck}`, true);
}

async function fetchYouTubeContent(externalId: string): Promise<FetchedContent> {
  if (!env.TRANSCRIPTAPI_API_KEY) {
    throw new TranscriptUnavailableError(
      "Source processing is temporarily unavailable. Please try again.",
      true,
    );
  }

  const url = new URL(TRANSCRIPT_API_URL);
  url.searchParams.set("video_url", `https://www.youtube.com/watch?v=${externalId}`);
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

  const body = await parseTranscriptJson(response);

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

  const segments = normalizeTranscriptSegments(getTranscriptSegments(body));

  if (segments.length === 0) {
    throw new TranscriptUnavailableError("No transcript segments were returned for this video.", true);
  }

  return {
    title: body?.metadata?.title ?? null,
    segments,
    raw: body ?? {},
  };
}

async function discoverExternalIds(url: string, sourceType: SourceType): Promise<string[]> {
  switch (sourceType) {
    case "youtube_video": {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new YouTubeDiscoveryError("Could not parse YouTube video ID from URL.", true);
      }

      return [videoId];
    }
    case "youtube_playlist": {
      const playlistId = extractPlaylistId(url);
      if (!playlistId) {
        throw new YouTubeDiscoveryError("Could not parse YouTube playlist ID from URL.", true);
      }

      return fetchPlaylistVideoIds(playlistId);
    }
    case "youtube_channel": {
      const uploadsPlaylistId = await resolveUploadsPlaylistId(url);
      if (!uploadsPlaylistId) {
        throw new YouTubeDiscoveryError("Could not resolve YouTube channel uploads playlist.", true);
      }

      return fetchPlaylistVideoIds(uploadsPlaylistId);
    }
    default: {
      const exhaustiveCheck: never = sourceType;
      throw new YouTubeDiscoveryError(`Unsupported source type: ${exhaustiveCheck}`, true);
    }
  }
}

async function fetchPlaylistVideoIds(playlistId: string): Promise<string[]> {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  let page = 0;

  while (page < MAX_PLAYLIST_PAGES && ids.size < MAX_PLAYLIST_VIDEOS) {
    page += 1;

    const response = await fetchYouTube<YoutubePlaylistItemsResponse>("playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: String(YOUTUBE_MAX_PAGE_SIZE),
      pageToken,
    });

    for (const item of response.items ?? []) {
      const videoId = item.contentDetails?.videoId;
      if (videoId) {
        ids.add(videoId);
      }

      if (ids.size >= MAX_PLAYLIST_VIDEOS) {
        break;
      }
    }

    if (!response.nextPageToken) {
      break;
    }

    pageToken = response.nextPageToken;
  }

  return Array.from(ids).slice(0, MAX_PLAYLIST_VIDEOS);
}

async function fetchPlaylistVideoIdsIncremental(
  playlistId: string,
  stopAtVideoId: string | null,
): Promise<PlaylistIncrementalResult> {
  const ids: string[] = [];
  const dedupe = new Set<string>();
  let pageToken: string | undefined;
  let page = 0;
  let stopMarkerIndex: number | null = null;

  while (page < MAX_PLAYLIST_PAGES && ids.length < MAX_PLAYLIST_VIDEOS) {
    page += 1;

    const response = await fetchYouTube<YoutubePlaylistItemsResponse>("playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: String(YOUTUBE_MAX_PAGE_SIZE),
      pageToken,
    });

    for (const item of response.items ?? []) {
      const videoId = item.contentDetails?.videoId;
      if (!videoId) {
        continue;
      }

      if (!dedupe.has(videoId)) {
        dedupe.add(videoId);
        ids.push(videoId);
      }

      if (stopAtVideoId && videoId === stopAtVideoId) {
        stopMarkerIndex = ids.findIndex((id) => id === stopAtVideoId);
        break;
      }

      if (ids.length >= MAX_PLAYLIST_VIDEOS) {
        break;
      }
    }

    if (stopMarkerIndex !== null || !response.nextPageToken || ids.length >= MAX_PLAYLIST_VIDEOS) {
      break;
    }

    pageToken = response.nextPageToken;
  }

  if (stopMarkerIndex !== null) {
    const bounded = ids.slice(0, stopMarkerIndex + 1 + SYNC_OVERLAP_VIDEOS);

    return {
      ids: bounded,
      headExternalId: ids[0] ?? stopAtVideoId,
    };
  }

  return {
    ids,
    headExternalId: ids[0] ?? stopAtVideoId,
  };
}

function parseYouTubeSyncCursor(
  cursor: Record<string, unknown> | null,
  sourceType: "youtube_playlist" | "youtube_channel",
): YouTubeSyncCursor | null {
  if (!cursor || typeof cursor !== "object") {
    return null;
  }

  if (sourceType === "youtube_playlist") {
    const kind = cursor.kind;
    const playlistId = cursor.playlistId;
    const headExternalId = cursor.headExternalId;

    if (
      kind === "youtube_playlist" &&
      typeof playlistId === "string" &&
      (typeof headExternalId === "string" || headExternalId === null)
    ) {
      return {
        kind,
        playlistId,
        headExternalId,
      };
    }

    return null;
  }

  const kind = cursor.kind;
  const uploadsPlaylistId = cursor.uploadsPlaylistId;
  const headExternalId = cursor.headExternalId;

  if (
    kind === "youtube_channel" &&
    typeof uploadsPlaylistId === "string" &&
    (typeof headExternalId === "string" || headExternalId === null)
  ) {
    return {
      kind,
      uploadsPlaylistId,
      headExternalId,
    };
  }

  return null;
}

async function fetchPlaylistMetadata(
  playlistId: string | null,
): Promise<{ title: string | null; authorName: string | null } | null> {
  if (!playlistId) {
    return null;
  }

  const response = await fetchYouTube<YoutubePlaylistsResponse>("playlists", {
    part: "snippet",
    id: playlistId,
    maxResults: "1",
  });

  const item = response.items?.[0];

  return {
    title: item?.snippet?.title?.trim() || null,
    authorName: item?.snippet?.channelTitle?.trim() || null,
  };
}

async function fetchVideoMetadata(externalIds: string[]): Promise<DiscoveredItem[]> {
  const discovered: DiscoveredItem[] = [];

  for (let i = 0; i < externalIds.length; i += YOUTUBE_VIDEO_BATCH_SIZE) {
    const batch = externalIds.slice(i, i + YOUTUBE_VIDEO_BATCH_SIZE);

    const response = await fetchYouTube<YoutubeVideosResponse>("videos", {
      part: "snippet,contentDetails",
      id: batch.join(","),
      maxResults: String(YOUTUBE_VIDEO_BATCH_SIZE),
    });

    for (const item of response.items ?? []) {
      const externalId = item.id;
      const title = item.snippet?.title;
      const thumbnailUrl =
        item.snippet?.thumbnails?.maxres?.url ??
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url;
      const authorName = item.snippet?.channelTitle;
      const authorId = item.snippet?.channelId;
      const publishedAtRaw = item.snippet?.publishedAt;
      const durationRaw = item.contentDetails?.duration;

      if (
        !externalId ||
        !title ||
        !thumbnailUrl ||
        !authorName ||
        !authorId ||
        !publishedAtRaw ||
        !durationRaw
      ) {
        continue;
      }

      const publishedAt = new Date(publishedAtRaw);
      if (Number.isNaN(publishedAt.getTime())) {
        continue;
      }

      discovered.push({
        externalId,
        contentType: "youtube_video",
        title,
        thumbnailUrl,
        authorName,
        authorId,
        publishedAt,
        durationSeconds: parseDurationSeconds(durationRaw),
      });
    }
  }

  const uniqueByExternalId = new Map<string, DiscoveredItem>();
  for (const video of discovered) {
    uniqueByExternalId.set(video.externalId, video);
  }

  return Array.from(uniqueByExternalId.values());
}

async function resolveUploadsPlaylistId(url: string): Promise<string | null> {
  const parsedUrl = new URL(url);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith("/channel/")) {
    const channelId = pathname.split("/")[2];
    if (!channelId) return null;
    return fetchUploadsPlaylistByChannelId(channelId);
  }

  if (pathname.startsWith("/@")) {
    const handle = pathname.slice(2).split("/")[0];
    if (!handle) return null;

    const channelsByHandle = await fetchYouTube<YoutubeChannelsResponse>("channels", {
      part: "id,contentDetails",
      forHandle: handle,
      maxResults: "1",
    });

    const directUploads = channelsByHandle.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (directUploads) {
      return directUploads;
    }

    const channelId = channelsByHandle.items?.[0]?.id;
    if (!channelId) return null;

    return fetchUploadsPlaylistByChannelId(channelId);
  }

  if (pathname.startsWith("/user/")) {
    const username = pathname.split("/")[2];
    if (!username) return null;

    const channelsByUsername = await fetchYouTube<YoutubeChannelsResponse>("channels", {
      part: "id,contentDetails",
      forUsername: username,
      maxResults: "1",
    });

    const directUploads = channelsByUsername.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (directUploads) {
      return directUploads;
    }

    const channelId = channelsByUsername.items?.[0]?.id;
    if (!channelId) return null;

    return fetchUploadsPlaylistByChannelId(channelId);
  }

  if (pathname.startsWith("/c/")) {
    return null;
  }

  return null;
}

async function fetchUploadsPlaylistByChannelId(channelId: string): Promise<string | null> {
  const channels = await fetchYouTube<YoutubeChannelsResponse>("channels", {
    part: "contentDetails",
    id: channelId,
    maxResults: "1",
  });

  return channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

function extractVideoId(url: string): string | null {
  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsedUrl.pathname.slice(1).split("/")[0];
    return id || null;
  }

  return parsedUrl.searchParams.get("v");
}

function extractPlaylistId(url: string): string | null {
  const parsedUrl = new URL(url);
  return parsedUrl.searchParams.get("list");
}

function parseDurationSeconds(duration: string): number {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);

  if (!match) {
    return 0;
  }

  const hours = Number(match[1] ?? "0");
  const minutes = Number(match[2] ?? "0");
  const seconds = Number(match[3] ?? "0");

  return (hours * 60 + minutes) * 60 + seconds;
}

async function fetchYouTube<T>(endpoint: string, params: Record<string, string | undefined>): Promise<T> {
  if (!env.YOUTUBE_DATA_API_KEY) {
    throw new YouTubeDiscoveryError(
      "Source processing is temporarily unavailable. Please try again.",
      true,
    );
  }

  const url = new URL(`${YOUTUBE_API_BASE_URL}/${endpoint}`);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  url.searchParams.set("key", env.YOUTUBE_DATA_API_KEY);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const body = await response.text();
    const parsedBody = safelyParseYouTubeErrorBody(body);
    throw new YouTubeDiscoveryError(
      getUserFacingYouTubeErrorMessage(response.status, parsedBody),
      isTerminalYouTubeError(response.status, parsedBody),
    );
  }

  return (await response.json()) as T;
}

function safelyParseYouTubeErrorBody(body: string): YoutubeApiErrorResponse | null {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as YoutubeApiErrorResponse;
  } catch {
    return null;
  }
}

function isTerminalYouTubeError(status: number, body: YoutubeApiErrorResponse | null): boolean {
  const reasons = new Set((body?.error?.errors ?? []).map((error) => error.reason).filter(Boolean));

  if (reasons.has("playlistNotFound") || reasons.has("playlistForbidden")) {
    return true;
  }

  if (status === 400 || status === 404) {
    return true;
  }

  if (status === 401 || status === 403) {
    return true;
  }

  return false;
}

function getUserFacingYouTubeErrorMessage(status: number, body: YoutubeApiErrorResponse | null): string {
  const reasons = new Set((body?.error?.errors ?? []).map((error) => error.reason).filter(Boolean));

  if (reasons.has("playlistNotFound") || reasons.has("playlistForbidden")) {
    return "This playlist is not accessible. Use a public or unlisted playlist URL.";
  }

  if (status === 404) {
    return "This source could not be found. Check the URL and try again.";
  }

  if (status === 401 || status === 403) {
    return "This source is not accessible right now. Check permissions and try again.";
  }

  if (status === 429) {
    return "Source processing is temporarily busy. Please try again.";
  }

  if (status >= 500) {
    return "Source processing is temporarily unavailable. Please try again.";
  }

  return "Could not process this source. Check the URL and try again.";
}

async function parseTranscriptJson(response: Response): Promise<TranscriptApiResponse | null> {
  try {
    return (await response.json()) as TranscriptApiResponse;
  } catch {
    return null;
  }
}

function normalizeTranscriptSegments(segments: TranscriptApiSegment[]): ContentSegment[] {
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
      anchors: [buildTimecodeAnchor(segment.startSeconds)],
    };
  });
}

function buildTimecodeAnchor(startSeconds: number): ContentAnchor {
  const rounded = Math.max(0, Math.floor(startSeconds));

  return {
    anchorKey: `timecode:${rounded}`,
    anchorType: "timecode",
    startValue: rounded,
    endValue: null,
    label: formatTimestampLabel(rounded),
    urlFragment: `t=${rounded}`,
    metadata: null,
  };
}

function formatTimestampLabel(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
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
