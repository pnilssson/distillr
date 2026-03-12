import "server-only";

import type { YouTubeSourceType } from "@/lib/validation/sources";
import { env } from "@/server/core/env";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_MAX_PAGE_SIZE = 50;
const YOUTUBE_VIDEO_BATCH_SIZE = 50;
const MAX_PLAYLIST_VIDEOS = 1000;
const MAX_PLAYLIST_PAGES = 20;

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

export type DiscoveredVideo = {
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  channelId: string;
  publishedAt: Date;
  durationSeconds: number;
};

export type SourceDiscoveryResult = {
  videos: DiscoveredVideo[];
  sourceChannelName: string | null;
  sourceTitle: string | null;
};

export class YouTubeDiscoveryError extends Error {
  readonly terminal: boolean;

  constructor(message: string, terminal: boolean) {
    super(message);
    this.name = "YouTubeDiscoveryError";
    this.terminal = terminal;
  }
}

export async function discoverVideosFromSource(
  url: string,
  sourceType: YouTubeSourceType,
): Promise<SourceDiscoveryResult> {
  const playlistMetadata =
    sourceType === "playlist" ? await fetchPlaylistMetadata(extractPlaylistId(url)) : null;

  const videoIds = await discoverVideoIds(url, sourceType);

  if (videoIds.length === 0) {
    return {
      videos: [],
      sourceChannelName: playlistMetadata?.channelName ?? null,
      sourceTitle: sourceType === "playlist" ? playlistMetadata?.title ?? null : null,
    };
  }

  const videos = await fetchVideoMetadata(videoIds);
  const primaryVideo = videos[0] ?? null;

  if (sourceType === "video") {
    return {
      videos,
      sourceChannelName: primaryVideo?.channelName ?? null,
      sourceTitle: primaryVideo?.title ?? null,
    };
  }

  if (sourceType === "playlist") {
    return {
      videos,
      sourceChannelName: playlistMetadata?.channelName ?? primaryVideo?.channelName ?? null,
      sourceTitle: playlistMetadata?.title ?? null,
    };
  }

  return {
    videos,
    sourceChannelName: primaryVideo?.channelName ?? null,
    sourceTitle: null,
  };
}

async function discoverVideoIds(url: string, sourceType: YouTubeSourceType): Promise<string[]> {
  switch (sourceType) {
    case "video": {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error("Could not parse YouTube video ID from URL.");
      }
      return [videoId];
    }
    case "playlist": {
      const playlistId = extractPlaylistId(url);
      if (!playlistId) {
        throw new Error("Could not parse YouTube playlist ID from URL.");
      }
      return fetchPlaylistVideoIds(playlistId);
    }
    case "channel": {
      const uploadsPlaylistId = await resolveUploadsPlaylistId(url);
      if (!uploadsPlaylistId) {
        throw new Error("Could not resolve YouTube channel uploads playlist.");
      }
      return fetchPlaylistVideoIds(uploadsPlaylistId);
    }
    default:
      return [];
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

async function fetchPlaylistMetadata(
  playlistId: string | null,
): Promise<{ title: string | null; channelName: string | null } | null> {
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
    channelName: item?.snippet?.channelTitle?.trim() || null,
  };
}

async function fetchVideoMetadata(videoIds: string[]): Promise<DiscoveredVideo[]> {
  const discovered: DiscoveredVideo[] = [];

  for (let i = 0; i < videoIds.length; i += YOUTUBE_VIDEO_BATCH_SIZE) {
    const batch = videoIds.slice(i, i + YOUTUBE_VIDEO_BATCH_SIZE);

    const response = await fetchYouTube<YoutubeVideosResponse>("videos", {
      part: "snippet,contentDetails",
      id: batch.join(","),
      maxResults: String(YOUTUBE_VIDEO_BATCH_SIZE),
    });

    for (const item of response.items ?? []) {
      const youtubeVideoId = item.id;
      const title = item.snippet?.title;
      const thumbnailUrl =
        item.snippet?.thumbnails?.maxres?.url ??
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url;
      const channelName = item.snippet?.channelTitle;
      const channelId = item.snippet?.channelId;
      const publishedAtRaw = item.snippet?.publishedAt;
      const durationRaw = item.contentDetails?.duration;

      if (
        !youtubeVideoId ||
        !title ||
        !thumbnailUrl ||
        !channelName ||
        !channelId ||
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
        youtubeVideoId,
        title,
        thumbnailUrl,
        channelName,
        channelId,
        publishedAt,
        durationSeconds: parseDurationSeconds(durationRaw),
      });
    }
  }

  const uniqueByVideoId = new Map<string, DiscoveredVideo>();
  for (const video of discovered) {
    uniqueByVideoId.set(video.youtubeVideoId, video);
  }

  return Array.from(uniqueByVideoId.values());
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
    throw new Error("Missing YOUTUBE_DATA_API_KEY environment variable.");
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
