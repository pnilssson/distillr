import "server-only";

import type { BillingState } from "@/lib/billing/types";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { getPolarCustomerState } from "@/server/billing/polar/customers";
import { buildBillingSnapshot } from "@/server/billing/polar/state";

type GetBillingStateForUserInput = {
  userId: string;
};

export async function getBillingStateForUser(input: GetBillingStateForUserInput): Promise<BillingState> {
  const state = await getPolarCustomerState(input.userId);

  if (!state) {
    return {
      billingEnabled: false,
      plan: "free",
      chatCreditsBalance: null,
      monthlyVideoBalance: null,
      lifetimeVideoConsumed: null,
      lifetimeVideoRemaining: null,
      hasTopUpAccess: false,
      allowedExportFormats: BILLING_PLANS.free.allowedExportFormats,
    };
  }

  const snapshot = buildBillingSnapshot(state);

  return {
    billingEnabled: true,
    plan: snapshot.plan,
    chatCreditsBalance: snapshot.chatCreditsBalance,
    monthlyVideoBalance: snapshot.monthlyVideoBalance,
    lifetimeVideoConsumed: snapshot.lifetimeVideoConsumed,
    lifetimeVideoRemaining:
      Number.isFinite(snapshot.lifetimeVideoRemaining) ? snapshot.lifetimeVideoRemaining : null,
    hasTopUpAccess: snapshot.hasTopUpAccess,
    allowedExportFormats: snapshot.allowedExportFormats,
  };
}
