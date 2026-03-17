"use client";

import { motion, useReducedMotion } from "framer-motion";

const exportFormats = ["Markdown", "PDF", "TXT"];
const queueStages = ["Queued", "Rendering", "Ready"];

const exportPreview = [
  { type: "heading", text: "Title: Research Notes: AI and the Future of Knowledge Work" },
  {
    type: "bold",
    text: "Across 14 videos from Lex Fridman, Dwarkesh Patel, and The Knowledge Project:",
  },
  {
    type: "item",
    text: "- All three channels agree that second-order effects of AI will hit knowledge work before physical work",
  },
  {
    type: "item",
    text: "- Dwarkesh Patel (ep. 48, 12:34) argues the constraint is not capability but institutional adoption speed",
  },
  {
    type: "item",
    text: "- Shane Parrish and his guest diverged sharply on timeline: Parrish sees a 3-year window, his guest argues incumbents will slow it to 10+ [38:17]",
  },
  { type: "spacer", text: "" },
  {
    type: "cite",
    text: "Sources: [Lex Fridman #399] [Dwarkesh Patel #48] [Knowledge Project #171]",
  },
];

const buildSlideLeft = (reduceMotion: boolean) => ({
  hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: reduceMotion
      ? { duration: 0.2 }
      : { duration: 0.55, ease: "easeOut" as const },
  },
});

const buildSlideRight = (reduceMotion: boolean) => ({
  hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: reduceMotion
      ? { duration: 0.2 }
      : { duration: 0.55, ease: "easeOut" as const },
  },
});

export function FeatureShowcaseDark() {
  const shouldReduceMotion = !!useReducedMotion();
  const slideLeft = buildSlideLeft(shouldReduceMotion);
  const slideRight = buildSlideRight(shouldReduceMotion);

  return (
    <section className="overflow-hidden bg-foreground text-background">
      <div className="mx-auto w-full max-w-5xl px-6 py-24 lg:py-36">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <motion.div
            className="relative overflow-hidden rounded-2xl border border-background/15 bg-background/5 p-5 font-mono text-xs"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={slideLeft}
          >
            <div className="mb-3 flex items-center justify-between border-b border-background/10 pb-3">
              <div className="flex items-center gap-2 text-[11px] tracking-wide text-background/60">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: [0.45, 1, 0.45], scale: [1, 1.2, 1] }
                  }
                  transition={
                    shouldReduceMotion
                      ? undefined
                      : {
                          duration: 2.8,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                        }
                  }
                />
                EXPORT SESSION
              </div>
              <span className="rounded-full border border-background/20 px-2 py-0.5 text-[10px] text-background/60">
                Auto-save on
              </span>
            </div>

            <div className="space-y-1.5">
              {exportPreview.map(({ type, text }, i) =>
                type === "spacer" ? (
                  <div key={i} className="h-2" />
                ) : (
                  <p
                    key={i}
                    className={
                      type === "heading" || type === "cite"
                        ? "text-background/40"
                        : "text-background/70"
                    }
                  >
                    {text}
                  </p>
                ),
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {queueStages.map((stage, index) => (
                <motion.div
                  key={stage}
                  className="rounded-lg border border-background/15 bg-background/5 px-2 py-1 text-[10px] uppercase tracking-wide text-background/60"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: [0.35, 1, 0.35], borderColor: ["hsl(0 0% 100% / 0.15)", "hsl(88 66% 55% / 0.65)", "hsl(0 0% 100% / 0.15)"] }
                  }
                  transition={
                    shouldReduceMotion
                      ? undefined
                      : {
                          duration: 5.4,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: index * 1.05,
                          ease: "easeInOut",
                        }
                  }
                >
                  {stage}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={slideRight}
          >
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-background/50">
              Export
            </p>
            <h2 className="mb-6 font-serif text-3xl leading-tight text-background sm:text-4xl">
              Export structured knowledge, not raw transcripts.
            </h2>
            <p className="leading-relaxed text-background/60">
              Summaries, structured notes, full transcripts, and chat history.
              Formatted and ready for Notion, Obsidian, or wherever you take
              notes.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {exportFormats.map((fmt, index) => (
                <motion.span
                  key={fmt}
                  className="rounded-full border border-background/20 px-3 py-1 text-xs text-background/70"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: [0.45, 1, 0.45], y: [0, -1, 0] }
                  }
                  transition={
                    shouldReduceMotion
                      ? undefined
                      : {
                          duration: 6,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: index * 1.1,
                          ease: "easeInOut",
                        }
                  }
                >
                  {fmt}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
