import "server-only";

import type { ModelAlias } from "@/server/core/ai/models";
import { AppError } from "@/server/core/errors/app-error";
import {
  ensurePolarCustomerProvisioned,
  getPolarCustomerState,
} from "@/server/billing/polar/customers";
import { buildBillingSnapshot } from "@/server/billing/polar/state";
import { SMART_EXPORT_CREDIT_COST } from "@/lib/exports/types";
import { ingestPolarEvent } from "@/server/billing/polar/client";
import { isPolarBillingEnabled } from "@/server/billing/polar/config";
import { env } from "@/server/core/env";

type CheckAndDeductCreditsParams = {
  userId: string;
  userEmail: string | null;
  userName?: string | null;
  modelId?: string;
  modelAlias?: ModelAlias;
  operation: "chat_message" | "smart_export";
  requiredCredits?: number;
};

export async function checkAndDeductCredits(params: CheckAndDeductCreditsParams): Promise<void> {
  void params.modelId;
  void params.modelAlias;

  const requiredCredits = Math.max(
    1,
    Math.floor(params.requiredCredits ?? getDefaultRequiredCredits(params.operation)),
  );

  await ensurePolarCustomerProvisioned({
    userId: params.userId,
    email: params.userEmail,
    name: params.userName,
  });

  const state = await getPolarCustomerState(params.userId);

  if (!state) {
    return;
  }

  const billing = buildBillingSnapshot(state);

  if (billing.chatCreditsBalance < requiredCredits) {
    throw createInsufficientCreditsError(params.operation, requiredCredits);
  }
}

export async function recordSmartExportCreditUsage(input: {
  userId: string;
  libraryId: string;
  resourceType: "chat_session" | "content_item";
  resourceId: string;
  format: "txt" | "md" | "pdf";
  creditsUsed?: number;
  externalId: string;
}): Promise<number> {
  if (!isPolarBillingEnabled()) {
    return 0;
  }

  const eventName = env.POLAR_EVENT_NAME_CHAT_CREDITS_CONSUMED;
  if (!eventName) {
    throw new AppError({
      code: "BILLING_CHAT_EVENT_NOT_CONFIGURED",
      userMessage: "Could not sync usage right now.",
      httpStatus: 503,
      retryable: false,
    });
  }

  const creditsUsed = Math.max(1, Math.floor(input.creditsUsed ?? SMART_EXPORT_CREDIT_COST));

  await ingestPolarEvent(
    {
      name: eventName,
      externalCustomerId: input.userId,
      externalId: input.externalId,
      metadata: {
        credits_used: creditsUsed,
        operation: "smart_export",
        library_id: input.libraryId,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        format: input.format,
      },
    },
    {
      idempotencyKey: input.externalId,
    },
  );

  return creditsUsed;
}

export function createInsufficientCreditsError(
  operation: "chat_message" | "smart_export" = "chat_message",
  requiredCredits = 1,
): AppError {
  const userMessage =
    operation === "smart_export"
      ? `You do not have enough credits for smart export. You need at least ${requiredCredits} credits.`
      : "You do not have enough credits for this message.";

  return new AppError({
    code: "INSUFFICIENT_CREDITS",
    userMessage,
    httpStatus: 402,
  });
}

function getDefaultRequiredCredits(operation: "chat_message" | "smart_export"): number {
  if (operation === "smart_export") {
    return SMART_EXPORT_CREDIT_COST;
  }

  return 1;
}
