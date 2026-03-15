import { NextResponse } from "next/server";

import { ensurePolarCustomerState } from "@/server/billing/polar/customers";
import { buildBillingSnapshot } from "@/server/billing/polar/state";
import { withApiAuth } from "@/server/core/auth/api";

export const GET = withApiAuth(async (_request, { user }) => {
  const state = await ensurePolarCustomerState({
    userId: user.id,
    email: user.email ?? null,
    name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
  });

  if (!state) {
    return NextResponse.json({
      billingEnabled: false,
      plan: "free",
      chatCreditsBalance: null,
      monthlyVideoBalance: null,
      lifetimeVideoConsumed: null,
      lifetimeVideoRemaining: null,
      hasTopUpAccess: false,
    });
  }

  const snapshot = buildBillingSnapshot(state);

  return NextResponse.json({
    billingEnabled: true,
    ...snapshot,
    lifetimeVideoRemaining:
      Number.isFinite(snapshot.lifetimeVideoRemaining) ? snapshot.lifetimeVideoRemaining : null,
  });
});
