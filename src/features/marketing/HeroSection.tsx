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
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-10 pb-24 text-center lg:py-36">
      {/* Badge */}
      <motion.div
        className="mb-6 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground"
        initial="hidden"
        animate="visible"
        custom={0}
        variants={fadeUp}
      >
        YouTube research library
      </motion.div>

      {/* Headline */}
      <motion.h1
        className="mb-6 max-w-2xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl"
        initial="hidden"
        animate="visible"
        custom={0.1}
        variants={fadeUp}
      >
        Your YouTube research, finally searchable.
      </motion.h1>

      {/* Subheadline */}
      <motion.p
        className="mb-4 max-w-xl text-lg leading-relaxed text-muted-foreground"
        initial="hidden"
        animate="visible"
        custom={0.2}
        variants={fadeUp}
      >
        Add your sources. Ask anything. Get cited answers with timestamp links.
      </motion.p>

      {/* Social proof hint */}
      <motion.p
        className="mb-10 text-sm text-muted-foreground"
        initial="hidden"
        animate="visible"
        custom={0.25}
        variants={fadeUp}
      >
        Built for analysts, researchers, and writers who treat YouTube as a
        primary source.
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
            Free to start. No credit card needed.
          </p>
        )}
      </motion.div>

    </section>
  );
}
