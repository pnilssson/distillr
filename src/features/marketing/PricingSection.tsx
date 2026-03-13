import Link from "next/link";

import { Button } from "@/components/ui/button";

interface PricingSectionProps {
  isAuthenticated?: boolean;
}

const plans = [
  {
    name: "Free",
    price: "€0",
    period: null,
    tagline: "Forever free",
    features: [
      "15 videos",
      "50 chat messages / mo",
      "TXT export",
      "1 library",
    ],
    cta: "Get started free",
    variant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Builder",
    price: "€14",
    period: "/mo",
    tagline: "For serious learners",
    features: [
      "300 videos",
      "500 chat messages / mo",
      "All export formats",
      "Channels & playlists",
    ],
    cta: "Start building",
    variant: "default" as const,
    highlighted: true,
  },
  {
    name: "Pro",
    price: "€34",
    period: "/mo",
    tagline: "For power users",
    features: [
      "1,500 videos",
      "2,000 chat messages / mo",
      "Priority processing",
      "All formats + API access",
    ],
    cta: "Go pro",
    variant: "outline" as const,
    highlighted: false,
  },
];

export function PricingSection({ isAuthenticated }: PricingSectionProps) {
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";

  return (
    <section id="pricing" className="mx-auto w-full max-w-5xl px-6 py-24">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Pricing
      </p>
      <h2 className="mb-4 text-center font-serif text-3xl sm:text-4xl">
        Start free. Scale as you grow.
      </h2>
      <p className="mb-16 text-center text-muted-foreground">
        No contracts. Cancel anytime.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-xl p-6 ${
              plan.highlighted
                ? "border-2 border-foreground bg-card"
                : "border bg-card"
            }`}
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
            <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
              {plan.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
            <Button
              asChild
              variant={plan.variant}
              className="mt-6 w-full"
            >
              <Link href={ctaHref}>{plan.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
