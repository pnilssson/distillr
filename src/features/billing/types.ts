export type BillingPlan = "free" | "builder" | "pro";

export type BillingState = {
  billingEnabled: boolean;
  plan: BillingPlan;
  chatCreditsBalance: number | null;
  monthlyVideoBalance: number | null;
  lifetimeVideoConsumed: number | null;
  lifetimeVideoRemaining: number | null;
  hasTopUpAccess: boolean;
};

export type BillingCheckoutTarget = "builder" | "pro" | "top_up_500";
