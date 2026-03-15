import "server-only";

import { env } from "@/server/core/env";

export type DistillrPlan = "free" | "builder" | "pro";

export const DISTILLR_LIFETIME_VIDEO_CAP_BY_PLAN: Record<DistillrPlan, number> = {
  free: 50,
  builder: 1000,
  pro: Number.POSITIVE_INFINITY,
};

export function isPolarBillingEnabled(): boolean {
  return Boolean(env.POLAR_ACCESS_TOKEN && env.POLAR_ENV);
}

export function getPolarBaseUrl(): string {
  return env.POLAR_ENV === "sandbox"
    ? "https://sandbox-api.polar.sh"
    : "https://api.polar.sh";
}

export function getDistillrProductIds(): Record<DistillrPlan | "topUp500", string | null> {
  return {
    free: env.POLAR_PRODUCT_ID_FREE ?? null,
    builder: env.POLAR_PRODUCT_ID_BUILDER ?? null,
    pro: env.POLAR_PRODUCT_ID_PRO ?? null,
    topUp500: env.POLAR_PRODUCT_ID_TOP_UP_500 ?? null,
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
