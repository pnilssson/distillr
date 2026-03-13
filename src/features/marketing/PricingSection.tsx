"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

interface PricingSectionProps {
  isAuthenticated?: boolean;
}

const plans = [
  {
    name: "Free",
    price: "€0",
    period: null,
    tagline: "Try it out",
    features: [
      "5 new videos per month",
      "Up to 20 videos in your library",
      "100 credits / mo",
      "Standard AI model",
      "TXT export",
      "1 library",
    ],
    missing: [
      "Advanced AI model",
      "Credit top-ups",
    ],
    cta: "Get started free",
    variant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Builder",
    price: "€17",
    period: "/mo",
    tagline: "Your personal research stack",
    features: [
      "50 new videos per month",
      "Up to 500 videos in your library",
      "1,000 credits / mo",
      "Standard + Advanced AI",
      "All export formats",
      "Unlimited libraries",
      "Credit top-ups available",
    ],
    missing: [],
    cta: "Start building",
    variant: "default" as const,
    highlighted: true,
  },
  {
    name: "Pro",
    price: "€39",
    period: "/mo",
    tagline: "For researchers and power users",
    features: [
      "150 new videos per month",
      "Unlimited videos in your library",
      "4,000 credits / mo",
      "Standard + Advanced AI",
      "Priority processing",
      "All export formats",
      "Credit top-ups available",
    ],
    missing: [],
    cta: "Go Pro",
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
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";

  return (
    <section id="pricing" className="mx-auto w-full max-w-5xl px-6 py-24 lg:py-36">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Pricing
        </p>
        <h2 className="mb-4 text-center font-serif text-3xl sm:text-4xl">
          Simple pricing. Start free.
        </h2>
        <p className="mb-16 text-center text-muted-foreground">
          No contracts. No credit card required. Cancel anytime.
        </p>
      </motion.div>

      <motion.div
        className="grid gap-4 sm:grid-cols-3"
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
                ? "border-2 border-foreground bg-card"
                : "border bg-card"
            }`}
            variants={fadeUp}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-0.5 text-xs font-medium text-background">
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
            <ul className="flex-1 space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-0.5 shrink-0 text-foreground">✓</span>
                  {feature}
                </li>
              ))}
              {plan.missing.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-muted-foreground/40 line-through">
                  <span className="mt-0.5 shrink-0">✗</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant={plan.variant}
              className="mt-6 w-full"
            >
              <Link href={ctaHref}>{plan.cta}</Link>
            </Button>
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        className="mt-8 text-center text-xs text-muted-foreground"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        Credits power chat. Standard AI costs 5 credits per message. Advanced AI costs 25 credits per message. Builder and Pro can top up with 500 credits for €5.
      </motion.p>
    </section>
  );
}
