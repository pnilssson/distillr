"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";

const buildFadeUp = (reduceMotion: boolean) => ({
  hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: reduceMotion
      ? { duration: 0.2, delay: 0 }
      : { duration: 0.55, ease: "easeOut" as const, delay },
  }),
});

interface HeroSectionProps {
  isAuthenticated?: boolean;
}

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
  const shouldReduceMotion = !!useReducedMotion();
  const fadeUp = buildFadeUp(shouldReduceMotion);
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";
  const ctaLabel = isAuthenticated ? "Go to dashboard" : "Try it free";
  const streamTransition = shouldReduceMotion
    ? undefined
    : {
        duration: 3,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut" as const,
      };

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute top-8 left-[10%] h-72 w-72 rounded-full bg-primary/25 blur-3xl"
          animate={
            shouldReduceMotion
              ? undefined
              : { x: [0, 18, -12, 0], y: [0, -12, 8, 0], scale: [1, 1.08, 0.96, 1] }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
          }
        />
        <motion.div
          className="absolute right-[8%] bottom-2 h-64 w-64 rounded-full bg-chart-2/15 blur-3xl"
          animate={
            shouldReduceMotion
              ? undefined
              : { x: [0, -14, 10, 0], y: [0, 8, -12, 0], scale: [1, 0.95, 1.06, 1] }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 16, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
          }
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(0_0%_0%/.07)_1px,transparent_0)] [background-size:24px_24px] opacity-35" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 pt-12 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
        <div className="text-center lg:text-left">
          <motion.div
            className="mb-6 inline-flex items-center rounded-full border bg-background/90 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur"
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
          >
            YouTube research library
          </motion.div>

          <motion.h1
            className="mb-6 max-w-2xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            initial="hidden"
            animate="visible"
            custom={0.1}
            variants={fadeUp}
          >
            Your YouTube research, finally searchable.
          </motion.h1>

          <motion.p
            className="mb-0 max-w-xl text-base leading-relaxed text-muted-foreground"
            initial="hidden"
            animate="visible"
            custom={0.2}
            variants={fadeUp}
          >
            Add your sources. Ask anything. Get cited answers with timestamp links.
          </motion.p>

          <motion.p
            className="mb-10 max-w-xl text-base leading-relaxed text-muted-foreground"
            initial="hidden"
            animate="visible"
            custom={0.25}
            variants={fadeUp}
          >
            Built for analysts, researchers, and writers who treat YouTube as a
            primary source.
          </motion.p>

          <motion.div
            className="flex flex-col items-center gap-2 lg:items-start"
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
        </div>

        <motion.div
          className="relative rounded-2xl border border-foreground/10 bg-card/95 p-4 text-left shadow-sm backdrop-blur"
          initial="hidden"
          animate="visible"
          custom={0.22}
          variants={fadeUp}
        >
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              LIVE LIBRARY CHAT
            </p>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-foreground">
              14 videos indexed
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border bg-muted/30 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Query
              </p>
              <p className="mt-1 text-sm">
                What did Dwarkesh and Lex disagree on about AI adoption speed?
              </p>
            </div>

            <div className="rounded-xl border bg-background p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Distillr
              </p>
              <motion.div
                className="mt-2 h-1.5 w-16 rounded-full bg-primary"
                animate={shouldReduceMotion ? undefined : { width: [56, 150, 88, 170] }}
                transition={streamTransition}
              />
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                Both channels agree AI can automate knowledge workflows first.
                They diverge on pace: Dwarkesh argues the blocker is institutional
                adoption, while Lex predicts faster displacement in tooling-heavy
                teams.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full border bg-muted/40 px-2 py-1">
                  Dwarkesh #48 - 12:34
                </span>
                <span className="rounded-full border bg-muted/40 px-2 py-1">
                  Lex #399 - 38:17
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
