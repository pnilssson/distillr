"use client";

import { motion } from "framer-motion";

const exportFormats = ["Markdown", "PDF", "TXT"];

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

const slideLeft = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

const slideRight = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

export function FeatureShowcaseDark() {
  return (
    <section className="bg-foreground text-background">
      <div className="mx-auto w-full max-w-5xl px-6 py-24 lg:py-36">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Export mockup */}
          <motion.div
            className="space-y-1.5 rounded-xl border border-background/10 bg-background/5 p-5 font-mono text-xs"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={slideLeft}
          >
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
          </motion.div>

          {/* Text */}
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
              {exportFormats.map((fmt) => (
                <span
                  key={fmt}
                  className="rounded-full border border-background/20 px-3 py-1 text-xs text-background/70"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
