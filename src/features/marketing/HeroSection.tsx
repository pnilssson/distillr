"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const, delay },
  }),
};

interface HeroSectionProps {
  isAuthenticated?: boolean;
}

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";
  const ctaLabel = isAuthenticated ? "Go to dashboard" : "Try it free";

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-28 text-center lg:py-36">
      {/* Badge */}
      <motion.div
        className="mb-6 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground"
        initial="hidden"
        animate="visible"
        custom={0}
        variants={fadeUp}
      >
        Your content. Your knowledge base.
      </motion.div>

      {/* Headline */}
      <motion.h1
        className="mb-6 max-w-2xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl"
        initial="hidden"
        animate="visible"
        custom={0.1}
        variants={fadeUp}
      >
        Your YouTube watching,
        <br />
        turned into lasting knowledge.
      </motion.h1>

      {/* Subheadline */}
      <motion.p
        className="mb-4 max-w-xl text-lg leading-relaxed text-muted-foreground"
        initial="hidden"
        animate="visible"
        custom={0.2}
        variants={fadeUp}
      >
        Most AI tools give you generic answers from across the internet.
        Distillr builds a personal knowledge base from your specific channels
        and videos so you always get answers about what you actually watch.
      </motion.p>

      {/* Social proof hint */}
      <motion.p
        className="mb-10 text-sm text-muted-foreground"
        initial="hidden"
        animate="visible"
        custom={0.25}
        variants={fadeUp}
      >
        Used by researchers, creators, and lifelong learners
      </motion.p>

      {/* CTA */}
      <motion.div
        className="flex flex-col items-center gap-2"
        initial="hidden"
        animate="visible"
        custom={0.35}
        variants={fadeUp}
      >
        <Button asChild size="lg" className="h-12 px-10 text-base">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground">
            Free forever. No credit card needed.
          </p>
        )}
      </motion.div>

      {/* PLACEHOLDER: Replace with actual app screenshot */}
      <motion.div
        className="mt-16 w-full max-w-3xl overflow-hidden rounded-2xl border shadow-xl"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" as const, delay: 0.45 }}
      >
        <div className="flex items-center gap-1.5 border-b bg-muted px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-border" />
          <div className="h-3 w-3 rounded-full bg-border" />
          <div className="h-3 w-3 rounded-full bg-border" />
          <span className="ml-2 text-xs text-muted-foreground">
            distillr.app
          </span>
        </div>
        <div className="flex min-h-80 flex-col items-center justify-center bg-muted/20 p-8 text-center">
          <div className="rounded-lg border-2 border-dashed border-border bg-background/50 px-8 py-6">
            <p className="text-sm font-medium text-muted-foreground">
              Screenshot placeholder
            </p>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground/60">
              Replace with: library view showing video list, search bar, and
              sidebar with libraries
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
