import "server-only";

import type { OpenAIModelAlias } from "@/server/core/openai/models";
import { AppError } from "@/server/core/errors/app-error";

type CheckAndDeductCreditsParams = {
  userId: string;
  modelId: string;
  modelAlias: OpenAIModelAlias;
  operation: "chat_message";
};

export async function checkAndDeductCredits(_params: CheckAndDeductCreditsParams): Promise<void> {
  void _params;
  // Billing is intentionally stubbed for MVP chat rollout.
}

export function createInsufficientCreditsError(): AppError {
  return new AppError({
    code: "INSUFFICIENT_CREDITS",
    userMessage: "You do not have enough credits for this message.",
    httpStatus: 402,
  });
}
