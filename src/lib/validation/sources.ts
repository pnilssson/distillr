import { z } from "zod";

export type YouTubeSourceType = "video" | "playlist" | "channel";

export function parseYouTubeUrl(raw: string): { type: YouTubeSourceType } | null {
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
  if (/^\/(channel\/|@|c\/)/.test(url.pathname)) return { type: "channel" };

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
