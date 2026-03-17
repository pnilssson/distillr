import "server-only";

import type { ModelAlias } from "@/server/core/ai/models";
import { AppError } from "@/server/core/errors/app-error";
import { ensurePolarCustomerState } from "@/server/billing/polar/customers";
import { buildBillingSnapshot } from "@/server/billing/polar/state";

type CheckAndDeductCreditsParams = {
  userId: string;
  userEmail: string | null;
  userName?: string | null;
  modelId: string;
  modelAlias: ModelAlias;
  operation: "chat_message";
};

export async function checkAndDeductCredits(params: CheckAndDeductCreditsParams): Promise<void> {
  void params.modelId;
  void params.modelAlias;
  void params.operation;

  const state = await ensurePolarCustomerState({
    userId: params.userId,
    email: params.userEmail,
    name: params.userName,
  });

  if (!state) {
    return;
  }

  const billing = buildBillingSnapshot(state);

  if (billing.chatCreditsBalance < 1) {
    throw createInsufficientCreditsError();
  }
}

export function createInsufficientCreditsError(): AppError {
  return new AppError({
    code: "INSUFFICIENT_CREDITS",
    userMessage: "You do not have enough credits for this message.",
    httpStatus: 402,
  });
}
