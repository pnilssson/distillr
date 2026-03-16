"use client";

import { PlusCircle, BookOpen, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    icon: PlusCircle,
    title: "Add your sources",
    desc: "Paste a YouTube channel, playlist, or video URL. Distillr does the rest.",
  },
  {
    step: "02",
    icon: BookOpen,
    title: "We process every video",
    desc: "Every video transcript is extracted and indexed into a searchable AI knowledge base. Ready in minutes.",
  },
  {
    step: "03",
    icon: MessageSquare,
    title: "Ask anything",
    desc: "Chat with your videos in plain language. Get answers pulled directly from video transcripts, with timestamp-linked sources.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-5xl px-6 py-24 lg:py-36">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          How it works
        </p>
        <h2 className="mb-6 text-center font-serif text-3xl sm:text-4xl">
          Three steps to your knowledge base
        </h2>
        <p className="mx-auto max-w-2xl text-center leading-relaxed text-muted-foreground">
          From channels you follow to grounded answers, Distillr keeps each step simple.
        </p>
      </motion.div>

      <motion.div
        className="mt-16 grid gap-10 sm:grid-cols-3"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
      >
        {steps.map(({ step, icon: Icon, title, desc }) => (
          <motion.div key={step} className="flex flex-col gap-3" variants={fadeUp}>
            <span className="font-mono text-xs text-muted-foreground">
              {step}
            </span>
            <div className="flex items-center gap-2">
              <Icon size={20} className="shrink-0 text-foreground" />
              <h3 className="font-medium">{title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
