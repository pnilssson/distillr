import "server-only";

import { BILLING_PLANS } from "@/lib/billing/plans";
import type { BillingPlan } from "@/lib/billing/types";
import { env } from "@/server/core/env";

export type DistillrPlan = BillingPlan;

export const DISTILLR_LIFETIME_VIDEO_CAP_BY_PLAN: Record<DistillrPlan, number> = {
  free: BILLING_PLANS.free.lifetimeVideoLimit ?? Number.POSITIVE_INFINITY,
  builder: BILLING_PLANS.builder.lifetimeVideoLimit ?? Number.POSITIVE_INFINITY,
  pro: BILLING_PLANS.pro.lifetimeVideoLimit ?? Number.POSITIVE_INFINITY,
};

export function isPolarBillingEnabled(): boolean {
  return Boolean(env.POLAR_ACCESS_TOKEN && env.POLAR_ENV);
}

export function getPolarBaseUrl(): string {
  return env.POLAR_ENV === "sandbox"
    ? "https://sandbox-api.polar.sh"
    : "https://api.polar.sh";
}

export function getDistillrProductIds(): Record<DistillrPlan | "topUp100", string | null> {
  return {
    free: env.POLAR_PRODUCT_ID_FREE ?? null,
    builder: env.POLAR_PRODUCT_ID_BUILDER ?? null,
    pro: env.POLAR_PRODUCT_ID_PRO ?? null,
    topUp100: env.POLAR_PRODUCT_ID_TOP_UP_100 ?? null,
  };
}

export function getDistillrMeterIds(): {
  chatCreditsUsed: string | null;
  videosIngestedMonthly: string | null;
  videosIngestedLifetime: string | null;
} {
  return {
    chatCreditsUsed: env.POLAR_METER_ID_CHAT_CREDITS_USED ?? null,
    videosIngestedMonthly: env.POLAR_METER_ID_VIDEOS_INGESTED_MONTHLY ?? null,
    videosIngestedLifetime: env.POLAR_METER_ID_VIDEOS_INGESTED_LIFETIME ?? null,
  };
}

export function resolvePlanByProductId(productId: string): DistillrPlan | null {
  const products = getDistillrProductIds();

  if (products.pro && productId === products.pro) {
    return "pro";
  }

  if (products.builder && productId === products.builder) {
    return "builder";
  }

  if (products.free && productId === products.free) {
    return "free";
  }

  return null;
}

export function rankPlan(plan: DistillrPlan): number {
  if (plan === "pro") {
    return 3;
  }

  if (plan === "builder") {
    return 2;
  }

  return 1;
}

export function getCreditsPerUsd(): number {
  return env.POLAR_CHAT_CREDITS_PER_USD ?? 100;
}
