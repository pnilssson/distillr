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
    monthlyChatCredits: 50,
    monthlyVideoLimit: 15,
    lifetimeVideoLimit: 100,
    hasTopUpAccess: false,
  },
  builder: {
    label: "Builder",
    monthlyPriceUsd: 19,
    monthlyChatCredits: 650,
    monthlyVideoLimit: 150,
    lifetimeVideoLimit: 2000,
    hasTopUpAccess: true,
  },
  pro: {
    label: "Pro",
    monthlyPriceUsd: 49,
    monthlyChatCredits: 1800,
    monthlyVideoLimit: 500,
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
