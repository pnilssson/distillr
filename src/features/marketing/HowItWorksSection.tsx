"use client";

import { PlusCircle, BookOpen, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    icon: PlusCircle,
    title: "Add your content",
    desc: "Paste a channel, playlist, or video link. Distillr does the rest.",
  },
  {
    step: "02",
    icon: BookOpen,
    title: "We process every video",
    desc: "Every video is transcribed and turned into a searchable knowledge base. Ready in minutes.",
  },
  {
    step: "03",
    icon: MessageSquare,
    title: "Ask anything",
    desc: "Ask a question in plain language. Get answers pulled directly from your videos, with sources.",
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
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          How it works
        </p>
        <h2 className="mb-16 text-center font-serif text-3xl sm:text-4xl">
          Three steps to your knowledge base
        </h2>
      </motion.div>

      <motion.div
        className="grid gap-10 sm:grid-cols-3"
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
            <Icon size={20} className="text-foreground" />
            <p className="font-medium">{title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
