import { NextResponse } from "next/server";

import { createBillingCheckoutSchema } from "@/lib/validation/billing";
import {
  createPolarCheckoutSession,
  listPolarSubscriptions,
} from "@/server/billing/polar/client";
import {
  ensurePolarCustomerProvisioned,
  getPolarCustomerState,
} from "@/server/billing/polar/customers";
import { getDistillrProductIds, resolvePlanByProductId, rankPlan } from "@/server/billing/polar/config";
import { isFreePrice } from "@/lib/billing/plans";
import type { BillingPlan } from "@/lib/billing/types";
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

  if (target === "top_up_tier_1" && !billing?.hasTopUpAccess) {
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

  const subscriptionId = target !== "top_up_tier_1"
    ? await findUpgradeableSubscriptionId(user.id, target)
    : undefined;

  const session = await createPolarCheckoutSession({
    externalCustomerId: user.id,
    productId,
    successUrl,
    returnUrl,
    subscriptionId,
    idempotencyKey: `distillr-checkout-${user.id}-${target}-${Date.now()}`,
  });

  const isPlanUpgrade = target !== "top_up_tier_1";

  if (isPlanUpgrade) {
    await captureServerEvent(user.id, "upgrade_clicked", {
      target_plan: target,
      source: "checkout",
    });
  } else {
    await captureServerEvent(user.id, "top_up_clicked", {
      target,
      source: "checkout",
    });
  }

  return NextResponse.json({ url: session.url });
});

function getProductIdForTarget(target: "builder" | "pro" | "top_up_tier_1"): string | null {
  const products = getDistillrProductIds();

  if (target === "top_up_tier_1") {
    return products.topUpTier1;
  }

  return products[target] ?? null;
}

async function findUpgradeableSubscriptionId(
  userId: string,
  targetPlan: BillingPlan,
): Promise<string | undefined> {
  const subscriptions = await listPolarSubscriptions({
    externalCustomerId: userId,
    active: true,
  });

  const targetRank = rankPlan(targetPlan);

  // Find the current active Distillr subscription that ranks below the target.
  // Polar's subscription_id on checkout only works for free-priced subscriptions.
  // For paid-to-paid upgrades, the webhook handles cleanup instead.
  let best: { id: string; rank: number } | undefined;

  for (const subscription of subscriptions) {
    const plan = resolvePlanByProductId(subscription.product_id);
    if (!plan) continue;

    const planRank = rankPlan(plan);
    if (planRank >= targetRank) continue;

    if (!isFreePrice(plan)) continue;

    if (!best || planRank > best.rank) {
      best = { id: subscription.id, rank: planRank };
    }
  }

  return best?.id;
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
