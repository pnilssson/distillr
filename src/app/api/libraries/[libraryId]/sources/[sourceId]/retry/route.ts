import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { withApiAuth } from "@/server/core/auth/api";
import { inngest } from "@/server/inngest/client";
import { getLibraryById } from "@/server/libraries/queries";
import {
  getSourceById,
  updateSourceStatus,
} from "@/server/sources/queries";

type RetrySourceRouteProps = {
  params: Promise<{ libraryId: string; sourceId: string }>;
};

const retrySourceParamsSchema = z.object({
  libraryId: z.string().uuid(),
  sourceId: z.string().uuid(),
});

export const POST = withApiAuth<RetrySourceRouteProps>(async (_request, { params, user }) => {
  const rawParams = await params;
  const parsedParams = retrySourceParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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

  if (source.status === "processing") {
    return NextResponse.json(
      { error: "This source is already being processed. Please wait and try again." },
      { status: 409 },
    );
  }

  const previousStatus = source.status === "failed" ? "failed" : "ready";
  const sourceProcessing = await updateSourceStatus(user.id, libraryId, sourceId, "processing");
  if (!sourceProcessing) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  try {
    await inngest.send({
      name: "source.added",
      data: {
        userId: user.id,
        libraryId,
        sourceId,
      },
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        area: "source.refresh",
      },
      extra: {
        userId: user.id,
        libraryId,
        sourceId,
      },
    });

    try {
      const rolledBack = await updateSourceStatus(user.id, libraryId, sourceId, previousStatus);
      if (!rolledBack) {
        Sentry.captureMessage("Failed to rollback source status after refresh queue failure.", {
          level: "error",
          tags: {
            area: "source.refresh.rollback",
          },
          extra: {
            userId: user.id,
            libraryId,
            sourceId,
            previousStatus,
          },
        });
      }
    } catch (rollbackError) {
      Sentry.captureException(rollbackError, {
        tags: {
          area: "source.refresh.rollback",
        },
        extra: {
          userId: user.id,
          libraryId,
          sourceId,
          previousStatus,
        },
      });
    }

    return NextResponse.json(
      { error: "Could not refresh this source right now. Please try again." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
});
