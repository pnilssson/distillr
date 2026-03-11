import { z } from "zod";

export type YouTubeSourceType = "video" | "playlist" | "channel";

export type ParsedYouTubeUrl =
  | { type: "video" }
  | { type: "playlist" }
  | { type: "channel"; handle: string };

export function parseYouTubeUrl(raw: string): ParsedYouTubeUrl | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host !== "youtube.com" && host !== "youtu.be") return null;

  if (host === "youtu.be" && url.pathname.length > 1) return { type: "video" };
  if (url.pathname === "/watch" && url.searchParams.get("v")) return { type: "video" };
  if (url.pathname === "/playlist" && url.searchParams.get("list")) return { type: "playlist" };

  const channelMatch = url.pathname.match(/^\/(channel\/|@|c\/)([^/?&]+)/);
  if (channelMatch) {
    const prefix = channelMatch[1];
    const id = channelMatch[2];
    const handle = prefix === "@" ? `@${id}` : id;
    return { type: "channel", handle };
  }

  return null;
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
