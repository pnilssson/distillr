"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

const checkpoints = [
  "Answers from your videos, not generic AI knowledge",
  "Works with content published yesterday, not just years ago",
  "Your full conversation history saved automatically",
];

const slideLeft = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

const slideRight = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

export function FeatureShowcaseChat() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24 lg:py-36">
      <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
        {/* Text */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={slideLeft}
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Chat
          </p>
          <h2 className="mb-4 font-serif text-3xl leading-tight sm:text-4xl">
            Get answers from your content, not the whole internet.
          </h2>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Most AI tools give you broad answers based on everything they have
            ever learned. Distillr focuses on what you actually watch. Your
            library stays current because it reads from your real channels and
            videos, including content published last week.
          </p>
          <ul className="space-y-2">
            {checkpoints.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check size={14} className="mt-0.5 shrink-0 text-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* PLACEHOLDER: Replace with actual chat screenshot */}
        <motion.div
          className="overflow-hidden rounded-2xl border bg-card shadow-lg"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={slideRight}
        >
          <div className="border-b bg-muted/40 px-4 py-3">
            <p className="text-xs font-medium">Chat with your library</p>
          </div>
          <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 px-6 py-5">
              <p className="text-sm font-medium text-muted-foreground">
                Chat screenshot placeholder
              </p>
              <p className="mt-1.5 max-w-xs text-xs text-muted-foreground/60">
                Replace with: chat interface showing a question and answer from
                a specific video
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
