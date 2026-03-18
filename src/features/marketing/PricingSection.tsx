"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/features/billing/api";
import { BILLING_PLANS } from "@/lib/billing/plans";
import type { BillingPlan } from "@/lib/billing/types";

interface PricingSectionProps {
  isAuthenticated?: boolean;
}

const plans = [
  {
    plan: "pro" as BillingPlan,
    name: "Pro",
    price: `$${BILLING_PLANS.pro.monthlyPriceUsd}`,
    period: "/mo",
    tagline: "For researchers and power users",
    features: [
      `${BILLING_PLANS.pro.monthlyVideoLimit} videos per month`,
      formatLifetimeLimit(BILLING_PLANS.pro.lifetimeVideoLimit),
      `${BILLING_PLANS.pro.monthlyChatCredits.toLocaleString("en-US")} credits / month`,
      "Unlimited libraries",
      "All export formats",
      "Priority processing",
      "Credit top-ups available",
    ],
    missing: [],
    cta: "Go Pro",
    variant: "outline" as const,
    highlighted: false,
  },
  {
    plan: "builder" as BillingPlan,
    name: "Builder",
    price: `$${BILLING_PLANS.builder.monthlyPriceUsd}`,
    period: "/mo",
    tagline: "Your personal research stack",
    features: [
      `${BILLING_PLANS.builder.monthlyVideoLimit} videos per month`,
      formatLifetimeLimit(BILLING_PLANS.builder.lifetimeVideoLimit),
      `${BILLING_PLANS.builder.monthlyChatCredits.toLocaleString("en-US")} credits / month`,
      "Unlimited libraries",
      "All export formats",
      "Credit top-ups available",
    ],
    missing: [
      "Unlimited videos saved",
      "Priority processing",
    ],
    cta: "Start building",
    variant: "default" as const,
    highlighted: true,
  },
  {
    plan: "free" as BillingPlan,
    name: "Free",
    price: `$${BILLING_PLANS.free.monthlyPriceUsd}`,
    period: null,
    tagline: "Try it out",
    features: [
      `${BILLING_PLANS.free.monthlyVideoLimit} videos per month`,
      formatLifetimeLimit(BILLING_PLANS.free.lifetimeVideoLimit),
      `${BILLING_PLANS.free.monthlyChatCredits.toLocaleString("en-US")} credits / month`,
      "1 library",
      "TXT export",
    ],
    missing: [
      "All export formats",
      "Unlimited libraries",
      "Priority processing",
    ],
    cta: "Get started free",
    variant: "outline" as const,
    highlighted: false,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export function PricingSection({ isAuthenticated }: PricingSectionProps) {
  const [pendingCheckoutPlan, setPendingCheckoutPlan] = useState<string | null>(null);
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";

  async function handlePlanCheckout(planName: "Builder" | "Pro") {
    setPendingCheckoutPlan(planName);

    try {
      const target = planName === "Pro" ? "pro" : "builder";
      const url = await createCheckoutSession(target, "/dashboard");
      window.location.assign(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start checkout right now.");
      setPendingCheckoutPlan(null);
    }
  }

  return (
    <section id="pricing" className="mx-auto w-full max-w-5xl px-6 py-24 lg:py-36">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Pricing
        </p>
        <h2 className="mb-6 text-center font-serif text-3xl sm:text-4xl">
          Simple pricing. Start free.
        </h2>
        <p className="text-center leading-relaxed text-muted-foreground">
          No contracts. No credit card required. Cancel anytime.
        </p>
      </motion.div>

      <motion.div
        className="mt-16 grid gap-4 pt-3 sm:grid-cols-3 sm:items-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
      >
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            className={`relative flex flex-col rounded-xl p-6 ${
              plan.highlighted
                ? "border-2 border-foreground bg-card pt-10 pb-7 sm:min-h-[530px] sm:justify-center"
                : "border bg-card"
            }`}
            variants={fadeUp}
          >
            {plan.highlighted && (
              <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-0.5 text-xs font-medium text-background">
                Most popular
              </span>
            )}
            <p className="font-medium">{plan.name}</p>
            <div className="mt-1 flex items-baseline gap-0.5">
              <span className="text-3xl font-semibold">{plan.price}</span>
              {plan.period && (
                <span className="text-base font-normal text-muted-foreground">
                  {plan.period}
                </span>
              )}
            </div>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">
              {plan.tagline}
            </p>
            <ul className="flex-1 space-y-2.5 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-foreground/80">
                  <span className="shrink-0 text-foreground">✓</span>
                  {feature}
                </li>
              ))}
              {plan.missing.length > 0 && (
                <li className="pt-1">
                  <hr className="border-border/50" />
                </li>
              )}
              {plan.missing.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-muted-foreground/40">
                  <span className="shrink-0">✗</span>
                  {feature}
                </li>
              ))}
            </ul>
            {isAuthenticated && (plan.name === "Builder" || plan.name === "Pro") ? (
              <Button
                variant={plan.variant}
                className="mt-6 w-full"
                onClick={() => {
                  void handlePlanCheckout(plan.name as "Builder" | "Pro");
                }}
                disabled={pendingCheckoutPlan !== null && pendingCheckoutPlan !== plan.name}
              >
                {pendingCheckoutPlan === plan.name ? "Opening checkout..." : plan.cta}
              </Button>
            ) : (
              <Button asChild variant={plan.variant} className="mt-6 w-full">
                <Link href={ctaHref}>{plan.cta}</Link>
              </Button>
            )}
          </motion.div>
        ))}
      </motion.div>

    </section>
  );
}

function formatLifetimeLimit(value: number | null): string {
  if (value === null) {
    return "Unlimited videos saved";
  }

  return `Up to ${value.toLocaleString("en-US")} videos saved`;
}
