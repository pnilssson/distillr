import { NextResponse } from "next/server";

import { createBillingPortalSchema } from "@/lib/validation/billing";
import { createPolarCustomerPortalSession } from "@/server/billing/polar/client";
import { ensurePolarCustomerProvisioned } from "@/server/billing/polar/customers";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { withApiAuth } from "@/server/core/auth/api";
import { env } from "@/server/core/env";

export const POST = withApiAuth(async (request, { user }) => {
  let payload: unknown = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const parsed = createBillingPortalSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  await ensurePolarCustomerProvisioned({
    userId: user.id,
    email: user.email ?? null,
    name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
  });

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const returnPath = sanitizeReturnPath(parsed.data.returnPath);
  const returnUrl = `${appUrl}${returnPath}`;

  const session = await createPolarCustomerPortalSession({
    externalCustomerId: user.id,
    returnUrl,
    idempotencyKey: `distillr-portal-${user.id}-${Date.now()}`,
  });

  await captureServerEvent(user.id, "billing_portal_opened", {
    source: "manage_billing",
    return_path: returnPath,
  });

  return NextResponse.json({ url: session.customer_portal_url });
});

function sanitizeReturnPath(value: string | undefined): string {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/")) {
    return "/dashboard";
  }

  if (value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}
