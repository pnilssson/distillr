import { NextResponse } from "next/server";

import { exportQuerySchema } from "@/lib/validation/exports";
import { withApiAuth } from "@/server/core/auth/api";
import { getLibraryById } from "@/server/libraries/queries";
import { getBillingStateForUser } from "@/server/billing/queries";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { buildChatSessionExportDocument } from "@/server/exports/document";
import { canExportFormat } from "@/server/exports/entitlements";
import { buildExportFilename } from "@/server/exports/filenames";
import { renderExportDocument } from "@/server/exports/renderers";
import { buildExportResponse } from "@/server/exports/response";

type ChatSessionExportRouteProps = {
  params: Promise<{ libraryId: string; sessionId: string }>;
};

export const runtime = "nodejs";

export const GET = withApiAuth<ChatSessionExportRouteProps>(async (request, { params, user }) => {
  const { libraryId, sessionId } = await params;

  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const parsedQuery = exportQuerySchema.safeParse({
    format: url.searchParams.get("format") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid export format." },
      { status: 400 },
    );
  }

  const billingState = await getBillingStateForUser({ userId: user.id });
  const format = parsedQuery.data.format;

  if (!canExportFormat(billingState, format)) {
    await captureServerEvent(user.id, "upgrade_prompt_shown", {
      source: "export",
      format,
      resource_type: "chat_session",
      library_id: libraryId,
      session_id: sessionId,
    });

    return NextResponse.json(
      { error: "This export format is available on Builder and Pro plans." },
      { status: 403 },
    );
  }

  const document = await buildChatSessionExportDocument({
    userId: user.id,
    libraryId,
    sessionId,
  });

  if (!document) {
    return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
  }

  const bytes = await renderExportDocument(format, document);
  const response = buildExportResponse({
    bytes,
    filename: buildExportFilename(document.title, format),
    format,
  });

  await captureServerEvent(user.id, "export_triggered", {
    format,
    resource_type: "chat_session",
    library_id: libraryId,
    session_id: sessionId,
    plan: billingState.plan,
  });

  return response;
});
