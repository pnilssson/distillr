import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { exportQuerySchema } from "@/lib/validation/exports";
import { checkAndDeductCredits, recordSmartExportCreditUsage } from "@/server/billing/credits";
import { withApiAuth } from "@/server/core/auth/api";
import { getLibraryById } from "@/server/libraries/queries";
import { getBillingStateForUser } from "@/server/billing/queries";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { isAppError } from "@/server/core/errors/app-error";
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
    variant: url.searchParams.get("variant") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Invalid export format." },
      { status: 400 },
    );
  }

  const billingState = await getBillingStateForUser({ userId: user.id });
  const format = parsedQuery.data.format;
  const variant = parsedQuery.data.variant;

  if (!canExportFormat(billingState, format)) {
    await captureServerEvent(user.id, "upgrade_prompt_shown", {
      source: "export",
      format,
      variant,
      resource_type: "chat_session",
      library_id: libraryId,
      session_id: sessionId,
    });

    return NextResponse.json(
      { error: "This export format is available on Builder and Pro plans." },
      { status: 403 },
    );
  }

  if (variant === "smart") {
    try {
      await checkAndDeductCredits({
        userId: user.id,
        userEmail: user.email ?? null,
        userName: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
        operation: "smart_export",
      });
    } catch (error) {
      if (isAppError(error) && error.code === "INSUFFICIENT_CREDITS") {
        await captureServerEvent(user.id, "upgrade_prompt_shown", {
          source: "export",
          reason: "insufficient_credits",
          variant,
          format,
          resource_type: "chat_session",
          library_id: libraryId,
          session_id: sessionId,
        });
      }

      throw error;
    }
  }

  const builtExport = await buildChatSessionExportDocument({
    userId: user.id,
    libraryId,
    sessionId,
    variant,
  });

  if (!builtExport) {
    return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
  }

  const { document, smartUsage } = builtExport;

  const bytes = await renderExportDocument(format, document);

  if (variant === "smart" && smartUsage) {
    await recordSmartExportCreditUsage({
      userId: user.id,
      libraryId,
      resourceType: "chat_session",
      resourceId: sessionId,
      format,
      modelId: smartUsage.modelId,
      inputTokens: smartUsage.inputTokens,
      outputTokens: smartUsage.outputTokens,
      totalTokens: smartUsage.totalTokens,
      cachedInputTokens: smartUsage.cachedInputTokens,
      externalId: `distillr-smart-export-${randomUUID()}`,
    });
  }

  const response = buildExportResponse({
    bytes,
    filename: buildExportFilename(document.title, format, variant),
    format,
  });

  await captureServerEvent(user.id, "export_triggered", {
    format,
    resource_type: "chat_session",
    library_id: libraryId,
    session_id: sessionId,
    plan: billingState.plan,
    variant,
  });

  return response;
});
