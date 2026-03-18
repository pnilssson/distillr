import type { BillingPlan } from "@/lib/billing/types";

export type BillingPlanSpec = {
  label: string;
  monthlyPriceUsd: number;
  monthlyChatCredits: number;
  monthlyVideoLimit: number;
  lifetimeVideoLimit: number | null;
  hasTopUpAccess: boolean;
};

export const BILLING_PLANS: Record<BillingPlan, BillingPlanSpec> = {
  free: {
    label: "Free",
    monthlyPriceUsd: 0,
    monthlyChatCredits: 100,
    monthlyVideoLimit: 10,
    lifetimeVideoLimit: 50,
    hasTopUpAccess: false,
  },
  builder: {
    label: "Builder",
    monthlyPriceUsd: 19,
    monthlyChatCredits: 900,
    monthlyVideoLimit: 100,
    lifetimeVideoLimit: 1000,
    hasTopUpAccess: true,
  },
  pro: {
    label: "Pro",
    monthlyPriceUsd: 49,
    monthlyChatCredits: 2500,
    monthlyVideoLimit: 300,
    lifetimeVideoLimit: null,
    hasTopUpAccess: true,
  },
};

export function getBillingPlanSpec(plan: BillingPlan): BillingPlanSpec {
  return BILLING_PLANS[plan];
}

export function getBillingPlanLabel(plan: BillingPlan): string {
  return BILLING_PLANS[plan].label;
}
