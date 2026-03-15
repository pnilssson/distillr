import "server-only";

import {
  DISTILLR_LIFETIME_VIDEO_CAP_BY_PLAN,
  rankPlan,
  resolvePlanByProductId,
  type DistillrPlan,
  getDistillrMeterIds,
} from "@/server/billing/polar/config";
import type { PolarCustomerState } from "@/server/billing/polar/types";

type MeterSnapshot = {
  balance: number;
  consumed: number;
  credited: number;
};

export type DistillrBillingSnapshot = {
  plan: DistillrPlan;
  chatCreditsBalance: number;
  monthlyVideoBalance: number;
  lifetimeVideoConsumed: number;
  lifetimeVideoRemaining: number;
  hasTopUpAccess: boolean;
};

export function buildBillingSnapshot(state: PolarCustomerState): DistillrBillingSnapshot {
  const plan = resolvePlanFromState(state);
  const meterIds = getDistillrMeterIds();

  const chat = getMeterSnapshot(state, meterIds.chatCreditsUsed);
  const monthly = getMeterSnapshot(state, meterIds.videosIngestedMonthly);
  const lifetime = getMeterSnapshot(state, meterIds.videosIngestedLifetime);

  const lifetimeCap = DISTILLR_LIFETIME_VIDEO_CAP_BY_PLAN[plan];
  const lifetimeVideoConsumed = Math.max(0, Math.floor(lifetime.consumed));
  const lifetimeVideoRemaining = Number.isFinite(lifetimeCap)
    ? Math.max(0, Math.floor(lifetimeCap - lifetimeVideoConsumed))
    : Number.POSITIVE_INFINITY;

  return {
    plan,
    chatCreditsBalance: Math.max(0, Math.floor(chat.balance)),
    monthlyVideoBalance: Math.max(0, Math.floor(monthly.balance)),
    lifetimeVideoConsumed,
    lifetimeVideoRemaining,
    hasTopUpAccess: plan === "builder" || plan === "pro",
  };
}

export function resolvePlanFromState(state: PolarCustomerState): DistillrPlan {
  const plans = state.active_subscriptions
    .map((subscription) => resolvePlanByProductId(subscription.product_id))
    .filter((plan): plan is DistillrPlan => Boolean(plan));

  if (plans.length === 0) {
    return "free";
  }

  return plans.reduce((best, next) => (rankPlan(next) > rankPlan(best) ? next : best));
}

export function getMeterSnapshot(
  state: PolarCustomerState,
  meterId: string | null,
): MeterSnapshot {
  if (!meterId) {
    return {
      balance: 0,
      consumed: 0,
      credited: 0,
    };
  }

  const meter = state.active_meters.find((entry) => entry.meter_id === meterId);

  return {
    balance: meter?.balance ?? 0,
    consumed: meter?.consumed_units ?? 0,
    credited: meter?.credited_units ?? 0,
  };
}
