import type { ExportFormat } from "@/lib/exports/types";

export type BillingPlan = "free" | "builder" | "pro";

export type BillingState = {
  billingEnabled: boolean;
  plan: BillingPlan;
  chatCreditsBalance: number | null;
  monthlyVideoBalance: number | null;
  lifetimeVideoConsumed: number | null;
  lifetimeVideoRemaining: number | null;
  hasTopUpAccess: boolean;
  allowedExportFormats: ExportFormat[];
};

export type BillingCheckoutTarget = "builder" | "pro" | "top_up_tier_1";

export type BillingCheckoutSource = "checkout" | "sidebar" | "chat" | "pricing" | "export";
