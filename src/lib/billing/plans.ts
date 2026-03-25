import type { BillingPlan } from "@/lib/billing/types";
import type { ExportFormat } from "@/lib/exports/types";

export type BillingPlanSpec = {
  label: string;
  monthlyPriceUsd: number;
  monthlyChatCredits: number;
  monthlyVideoLimit: number;
  lifetimeVideoLimit: number | null;
  hasTopUpAccess: boolean;
  allowedExportFormats: ExportFormat[];
};

export const BILLING_PLANS: Record<BillingPlan, BillingPlanSpec> = {
  free: {
    label: "Free",
    monthlyPriceUsd: 0,
    monthlyChatCredits: 25,
    monthlyVideoLimit: 15,
    lifetimeVideoLimit: 100,
    hasTopUpAccess: false,
    allowedExportFormats: ["txt"],
  },
  builder: {
    label: "Builder",
    monthlyPriceUsd: 9,
    monthlyChatCredits: 250,
    monthlyVideoLimit: 150,
    lifetimeVideoLimit: 1000,
    hasTopUpAccess: true,
    allowedExportFormats: ["txt", "md", "pdf"],
  },
  pro: {
    label: "Pro",
    monthlyPriceUsd: 24,
    monthlyChatCredits: 750,
    monthlyVideoLimit: 450,
    lifetimeVideoLimit: null,
    hasTopUpAccess: true,
    allowedExportFormats: ["txt", "md", "pdf"],
  },
};

export function getBillingPlanSpec(plan: BillingPlan): BillingPlanSpec {
  return BILLING_PLANS[plan];
}

export function getBillingPlanLabel(plan: BillingPlan): string {
  return BILLING_PLANS[plan].label;
}

export function isFreePrice(plan: BillingPlan): boolean {
  return BILLING_PLANS[plan].monthlyPriceUsd === 0;
}

export function canPlanUseExportFormat(plan: BillingPlan, format: ExportFormat): boolean {
  return BILLING_PLANS[plan].allowedExportFormats.includes(format);
}
