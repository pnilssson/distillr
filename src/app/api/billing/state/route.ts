import { NextResponse } from "next/server";

import { getBillingStateForUser } from "@/server/billing/queries";
import { withApiAuth } from "@/server/core/auth/api";

export const GET = withApiAuth(async (_request, { user }) => {
  const billingState = await getBillingStateForUser({
    userId: user.id,
  });

  return NextResponse.json(billingState);
});
