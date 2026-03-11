type OEmbedResponse = {
  title: string;
  author_name: string;
};

/**
 * Fetches title and channel name from YouTube's oEmbed endpoint.
 * Works for video and playlist URLs. For channel URLs, oEmbed may not
 * respond, so callers can supply a fallback handle parsed from the URL.
 * Returns nulls on any network or parse failure.
 */
export async function fetchYouTubeOEmbed(
  url: string,
  fallbackChannelHandle: string | null = null,
): Promise<{ channelName: string | null; title: string | null }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const data = (await res.json()) as OEmbedResponse;
      return {
        channelName: data.author_name ?? fallbackChannelHandle,
        title: data.title ?? null,
      };
    }
  } catch {
    // oEmbed unavailable - fall through to nulls
  }

  return { channelName: fallbackChannelHandle, title: null };
}
