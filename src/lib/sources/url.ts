import type { ContentType } from "@/lib/sources/types";

export function buildItemUrl(externalId: string, contentType: ContentType): string {
  switch (contentType) {
    case "youtube_video":
      return `https://www.youtube.com/watch?v=${encodeURIComponent(externalId)}`;
    default:
      return assertNever(contentType);
  }
}

export function buildAnchorUrl(
  externalId: string,
  contentType: ContentType,
  urlFragment: string | null,
): string {
  const itemUrl = buildItemUrl(externalId, contentType);
  if (!urlFragment) {
    return itemUrl;
  }

  switch (contentType) {
    case "youtube_video": {
      const url = new URL(itemUrl);
      const params = new URLSearchParams(urlFragment);

      for (const [key, value] of params.entries()) {
        url.searchParams.set(key, value);
      }

      return url.toString();
    }
    default:
      return assertNever(contentType);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled content type: ${String(value)}`);
}
