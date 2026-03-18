import "server-only";

import type { BillingState } from "@/lib/billing/types";
import { ensurePolarCustomerState } from "@/server/billing/polar/customers";
import { buildBillingSnapshot } from "@/server/billing/polar/state";

type GetBillingStateForUserInput = {
  userId: string;
  email: string | null;
  name: string | null;
};

export async function getBillingStateForUser(input: GetBillingStateForUserInput): Promise<BillingState> {
  const state = await ensurePolarCustomerState({
    userId: input.userId,
    email: input.email,
    name: input.name,
  });

  if (!state) {
    return {
      billingEnabled: false,
      plan: "free",
      chatCreditsBalance: null,
      monthlyVideoBalance: null,
      lifetimeVideoConsumed: null,
      lifetimeVideoRemaining: null,
      hasTopUpAccess: false,
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
  };
}
