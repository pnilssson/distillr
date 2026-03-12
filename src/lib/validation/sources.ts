import { z } from "zod";

export type YouTubeSourceType = "video" | "playlist" | "channel";

export type ParsedYouTubeUrl =
  | { type: "video"; sourceKey: string }
  | { type: "playlist"; sourceKey: string }
  | { type: "channel"; sourceKey: string; channelRef: string };

export function parseYouTubeUrl(raw: string): ParsedYouTubeUrl | null {
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
    return { type: "playlist", sourceKey: `playlist:${playlistId}` };
  }

  if (host === "youtu.be") {
    const videoId = getPathFirstSegment(url.pathname);
    if (videoId) {
      return { type: "video", sourceKey: `video:${videoId}` };
    }
  }

  if (url.pathname === "/watch") {
    const videoId = url.searchParams.get("v")?.trim();
    if (videoId) {
      return { type: "video", sourceKey: `video:${videoId}` };
    }
  }

  const channelMatch = url.pathname.match(/^\/(channel\/|@|c\/)([^/?&]+)/);
  if (channelMatch) {
    const prefix = channelMatch[1];
    const id = channelMatch[2];
    const channelRef = prefix === "@" ? `@${id}`.toLowerCase() : `${prefix}${id}`;
    return {
      type: "channel",
      sourceKey: `channel:${channelRef}`,
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
      (v) => parseYouTubeUrl(v) !== null,
      "Must be a valid YouTube video, playlist, or channel URL.",
    ),
});

export type AddSourceInput = z.infer<typeof addSourceSchema>;
