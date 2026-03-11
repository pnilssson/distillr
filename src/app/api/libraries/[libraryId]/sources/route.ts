import { NextResponse } from "next/server";

import { addSourceSchema, parseYouTubeUrl } from "@/lib/validation/sources";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { getLibraryById } from "@/server/libraries/queries";
import { createSource, getLibrarySources } from "@/server/sources/queries";

type SourcesRouteProps = {
  params: Promise<{ libraryId: string }>;
};

type OEmbedResponse = {
  title: string;
  author_name: string;
};

async function fetchYouTubeMetadata(
  url: string,
  sourceType: "video" | "playlist" | "channel",
): Promise<{ channelName: string | null; title: string | null }> {
  // For channel sources, try to extract the handle from the URL as a fallback
  if (sourceType === "channel") {
    const channelHandleMatch = url.match(/youtube\.com\/(?:@|channel\/|c\/)([^/?&]+)/);
    const fallbackName = channelHandleMatch ? channelHandleMatch[1] : null;

    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = (await res.json()) as OEmbedResponse;
        return { channelName: data.author_name ?? fallbackName, title: null };
      }
    } catch {
      // oEmbed failed - use URL-parsed fallback
    }

    return { channelName: fallbackName, title: null };
  }

  // For video and playlist sources use oEmbed
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const data = (await res.json()) as OEmbedResponse;
      return {
        channelName: data.author_name ?? null,
        title: data.title ?? null,
      };
    }
  } catch {
    // oEmbed failed - store nulls and fall back to URL display
  }

  return { channelName: null, title: null };
}

export async function GET(_request: Request, { params }: SourcesRouteProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { libraryId } = await params;
  const sources = await getLibrarySources(user.id, libraryId);

  return NextResponse.json({ sources });
}

export async function POST(request: Request, { params }: SourcesRouteProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = addSourceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { libraryId } = await params;

  // Verify library belongs to user
  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  const parsed_url = parseYouTubeUrl(parsed.data.url)!;
  const metadata = await fetchYouTubeMetadata(parsed.data.url, parsed_url.type);
  const source = await createSource(user.id, libraryId, parsed.data.url, parsed_url.type, metadata);

  if (!source) {
    return NextResponse.json({ error: "Unable to add source." }, { status: 500 });
  }

  await captureServerEvent(user.id, "source_added", {
    library_id: libraryId,
    source_type: parsed_url.type,
  });

  // TODO: fire source.added Inngest event (wired in next task)

  return NextResponse.json({ source }, { status: 201 });
}
