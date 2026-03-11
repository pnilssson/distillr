import { NextResponse } from "next/server";

import { fetchYouTubeOEmbed } from "@/lib/youtube";
import { addSourceSchema, parseYouTubeUrl } from "@/lib/validation/sources";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { getLibraryById } from "@/server/libraries/queries";
import { createSource, getLibrarySources } from "@/server/sources/queries";

type SourcesRouteProps = {
  params: Promise<{ libraryId: string }>;
};

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

  const parsedUrl = parseYouTubeUrl(parsed.data.url)!;
  const fallbackHandle = parsedUrl.type === "channel" ? parsedUrl.handle : null;
  const { channelName, title: oEmbedTitle } = await fetchYouTubeOEmbed(parsed.data.url, fallbackHandle);
  // Channel sources have no distinct title - only the channel name matters
  const title = parsedUrl.type === "channel" ? null : oEmbedTitle;

  const source = await createSource(user.id, libraryId, parsed.data.url, parsedUrl.type, { channelName, title });

  if (!source) {
    return NextResponse.json({ error: "Unable to add source." }, { status: 500 });
  }

  await captureServerEvent(user.id, "source_added", {
    library_id: libraryId,
    source_type: parsedUrl.type,
  });

  // TODO: fire source.added Inngest event (wired in next task)

  return NextResponse.json({ source }, { status: 201 });
}
