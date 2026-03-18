import { NextResponse } from "next/server";

import { getBillingStateForUser } from "@/server/billing/queries";
import { withApiAuth } from "@/server/core/auth/api";

export const GET = withApiAuth(async (_request, { user }) => {
  const billingState = await getBillingStateForUser({
    userId: user.id,
    email: user.email ?? null,
    name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
  });

  return NextResponse.json(billingState);
});
