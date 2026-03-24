import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { withApiAuth } from "@/server/core/auth/api";
import { inngest } from "@/server/inngest/client";
import { getLibraryById } from "@/server/libraries/queries";
import { getSourceById, updateSourceAutoSync } from "@/server/sources/queries";

type SourceAutoSyncRouteProps = {
  params: Promise<{ libraryId: string; sourceId: string }>;
};

const paramsSchema = z.object({
  libraryId: z.string().uuid(),
  sourceId: z.string().uuid(),
});

const bodySchema = z.object({
  enabled: z.boolean(),
});

export const PATCH = withApiAuth<SourceAutoSyncRouteProps>(async (request, { params, user }) => {
  const rawParams = await params;
  const parsedParams = paramsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { libraryId, sourceId } = parsedParams.data;

  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  const source = await getSourceById(user.id, libraryId, sourceId);
  if (!source) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  if (source.sourceType === "youtube_video") {
    return NextResponse.json(
      { error: "Auto-sync is only available for playlists and channels." },
      { status: 400 },
    );
  }

  const updated = await updateSourceAutoSync(
    user.id,
    libraryId,
    sourceId,
    parsedBody.data.enabled,
  );

  if (!updated) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  if (parsedBody.data.enabled) {
    try {
      await inngest.send({
        name: "source.sync.requested",
        data: {
          userId: user.id,
          libraryId,
          sourceId,
        },
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          area: "source.auto_sync.enable",
        },
        extra: {
          userId: user.id,
          libraryId,
          sourceId,
        },
      });
    }
  }

  return NextResponse.json({ source: updated });
});
