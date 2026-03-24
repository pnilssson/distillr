import { z } from "zod";

export type ParsedSourceUrl =
  | { sourceType: "youtube_video"; sourceKey: string }
  | { sourceType: "youtube_playlist"; sourceKey: string }
  | { sourceType: "youtube_channel"; sourceKey: string; channelRef: string };

export function parseSourceUrl(raw: string): ParsedSourceUrl | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host !== "youtube.com" && host !== "youtu.be") return null;

  const playlistId = url.searchParams.get("list")?.trim();
  if (playlistId) {
    return {
      sourceType: "youtube_playlist",
      sourceKey: `youtube_playlist:${playlistId}`,
    };
  }

  if (host === "youtu.be") {
    const videoId = getPathFirstSegment(url.pathname);
    if (videoId) {
      return {
        sourceType: "youtube_video",
        sourceKey: `youtube_video:${videoId}`,
      };
    }
  }

  if (url.pathname === "/watch") {
    const videoId = url.searchParams.get("v")?.trim();
    if (videoId) {
      return {
        sourceType: "youtube_video",
        sourceKey: `youtube_video:${videoId}`,
      };
    }
  }

  const channelMatch = url.pathname.match(/^\/(channel\/|@)([^/?&]+)/);
  if (channelMatch) {
    const prefix = channelMatch[1];
    const id = channelMatch[2];
    const channelRef = prefix === "@" ? `@${id}`.toLowerCase() : `${prefix}${id}`;
    return {
      sourceType: "youtube_channel",
      sourceKey: `youtube_channel:${channelRef}`,
      channelRef,
    };
  }

  return null;
}

function getPathFirstSegment(pathname: string): string | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.trim();
  return firstSegment && firstSegment.length > 0 ? firstSegment : null;
}

export const addSourceSchema = z.object({
  url: z
      .string()
      .trim()
      .min(1, "URL is required.")
      .refine(
        (v) => parseSourceUrl(v) !== null,
        "Must be a valid YouTube video, playlist, or channel URL.",
      ),
  autoSyncEnabled: z.boolean().optional(),
});

export type AddSourceInput = z.infer<typeof addSourceSchema>;
