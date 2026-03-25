import { NextResponse } from "next/server";

import { createBillingCheckoutSchema } from "@/lib/validation/billing";
import {
  createPolarCheckoutSession,
} from "@/server/billing/polar/client";
import {
  ensurePolarCustomerProvisioned,
  getPolarCustomerState,
} from "@/server/billing/polar/customers";
import { getDistillrProductIds } from "@/server/billing/polar/config";
import { buildBillingSnapshot } from "@/server/billing/polar/state";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { withApiAuth } from "@/server/core/auth/api";
import { env } from "@/server/core/env";

export const POST = withApiAuth(async (request, { user }) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = createBillingCheckoutSchema.safeParse(payload);
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

  const target = parsed.data.target;
  const state = await getPolarCustomerState(user.id);
  const billing = state ? buildBillingSnapshot(state) : null;

  if (target === "top_up_100" && !billing?.hasTopUpAccess) {
    return NextResponse.json(
      { error: "Top-ups are available on paid plans." },
      { status: 403 },
    );
  }

  const productId = getProductIdForTarget(target);
  if (!productId) {
    return NextResponse.json(
      { error: "Billing is not configured right now." },
      { status: 503 },
    );
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const returnPath = sanitizeReturnPath(parsed.data.returnPath);

  const successUrl = `${appUrl}${returnPath}?billing=success`;
  const returnUrl = `${appUrl}${returnPath}`;

  const session = await createPolarCheckoutSession({
    externalCustomerId: user.id,
    productId,
    successUrl,
    returnUrl,
    idempotencyKey: `distillr-checkout-${user.id}-${target}-${Date.now()}`,
  });

  if (target === "builder" || target === "pro") {
    await captureServerEvent(user.id, "upgrade_clicked", {
      target_plan: target,
      source: "checkout",
    });
  }

  if (target === "top_up_100") {
    await captureServerEvent(user.id, "top_up_clicked", {
      target: "top_up_100",
      source: "checkout",
    });
  }

  return NextResponse.json({ url: session.url });
});

function getProductIdForTarget(target: "builder" | "pro" | "top_up_100"): string | null {
  const products = getDistillrProductIds();

  if (target === "builder") {
    return products.builder;
  }

  if (target === "pro") {
    return products.pro;
  }

  return products.topUp100;
}

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
