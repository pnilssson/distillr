import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { addSourceSchema, parseSourceUrl } from "@/lib/validation/sources";
import { ensurePolarCustomerState } from "@/server/billing/polar/customers";
import { inngest } from "@/server/inngest/client";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { withApiAuth } from "@/server/core/auth/api";
import { getLibraryById } from "@/server/libraries/queries";
import {
  createSource,
  deleteSource,
  getLibrarySources,
  getSourceBySourceKey,
} from "@/server/sources/queries";

type SourcesRouteProps = {
  params: Promise<{ libraryId: string }>;
};

export const GET = withApiAuth<SourcesRouteProps>(async (_request, { params, user }) => {
  const { libraryId } = await params;
  const sources = await getLibrarySources(user.id, libraryId);

  return NextResponse.json({ sources });
});

export const POST = withApiAuth<SourcesRouteProps>(async (request, { params, user }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

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

  await ensurePolarCustomerState({
    userId: user.id,
    email: user.email ?? null,
    name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
  });

  const parsedUrl = parseSourceUrl(parsed.data.url);
  if (!parsedUrl) {
    return NextResponse.json(
      { error: "Must be a valid YouTube video, playlist, or channel URL." },
      { status: 400 },
    );
  }

  const existingSource = await getSourceBySourceKey(user.id, libraryId, parsedUrl.sourceKey);
  if (existingSource) {
    return NextResponse.json(
      { error: "This source has already been added to this library." },
      { status: 409 },
    );
  }

  const source = await createSource(
    user.id,
    libraryId,
    parsed.data.url,
    parsedUrl.sourceKey,
    parsedUrl.sourceType,
    "processing",
    null,
    null,
  );

  if (!source) {
    return NextResponse.json(
      { error: "This source has already been added to this library." },
      { status: 409 },
    );
  }

  try {
    await inngest.send({
      name: "source.added",
      data: {
        userId: user.id,
        libraryId,
        sourceId: source.id,
      },
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        area: "source.create",
      },
      extra: {
        userId: user.id,
        libraryId,
        sourceId: source.id,
      },
    });

    try {
      const rolledBack = await deleteSource(user.id, libraryId, source.id);

      if (!rolledBack) {
        Sentry.captureMessage("Failed to rollback source after queue failure.", {
          level: "error",
          tags: {
            area: "source.create.rollback",
          },
          extra: {
            userId: user.id,
            libraryId,
            sourceId: source.id,
          },
        });
      }
    } catch (rollbackError) {
      Sentry.captureException(rollbackError, {
        tags: {
          area: "source.create.rollback",
        },
        extra: {
          userId: user.id,
          libraryId,
          sourceId: source.id,
        },
      });
    }

    return NextResponse.json(
      { error: "Could not process this source right now. Please try again." },
      { status: 503 },
    );
  }

  await captureServerEvent(user.id, "source_added", {
    library_id: libraryId,
    source_type: parsedUrl.sourceType,
  });

  return NextResponse.json({ source }, { status: 201 });
});

const deleteSourceSchema = z.object({
  sourceId: z.string().uuid(),
});

export const DELETE = withApiAuth<SourcesRouteProps>(async (request, { params, user }) => {
  const { libraryId } = await params;

  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const parsed = deleteSourceSchema.safeParse({
    sourceId: url.searchParams.get("sourceId"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid source id." }, { status: 400 });
  }

  const deleted = await deleteSource(user.id, libraryId, parsed.data.sourceId);
  if (!deleted) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
