"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const checkpoints = [
  "Answers from creators you follow, not generic AI knowledge",
  "Works with content published yesterday, not just years ago",
  "Full conversation history saved automatically",
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const, delay },
  }),
};

export function FeatureShowcaseChat() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24 lg:py-36">
      <motion.div
        className="mx-auto mb-16 max-w-3xl text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        custom={0}
        variants={fadeUp}
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Chat
        </p>
        <h2 className="mb-6 font-serif text-3xl leading-tight sm:text-4xl">
          Answers from creators you trust, not the entire internet.
        </h2>
        <p className="leading-relaxed text-muted-foreground">
          Most AI tools give you broad answers based on everything they have
          ever learned. Distillr only answers from the channels, playlists,
          and videos you choose to learn from. Your library stays current
          because new uploads are indexed
          automatically.
        </p>

        <ul className="mx-auto mt-16 flex max-w-3xl flex-col items-center gap-3 text-sm">
          {checkpoints.map((item) => (
            <li
              key={item}
              className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border bg-background px-4 py-2 text-center"
            >
              <Check size={14} className="shrink-0 text-foreground" />
              {item}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        className="overflow-hidden rounded-2xl border bg-card shadow-lg"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        custom={0.1}
        variants={fadeUp}
      >
        <div className="border-b bg-muted/40 px-4 py-3 text-left">
          <p className="text-xs font-medium text-muted-foreground">
            Source-backed chat answers
          </p>
        </div>
        <div
          className="relative w-full overflow-hidden bg-muted/20"
          style={{ aspectRatio: "16 / 10" }}
        >
          <Image
            src="/marketing/landing-chat-app-1600x1000.png"
            alt="Distillr chat answering a question with cited video sources"
            fill
            className="object-cover object-top"
            sizes="(min-width: 1024px) 64rem, 100vw"
          />
        </div>
      </motion.div>
    </section>
  );
}
