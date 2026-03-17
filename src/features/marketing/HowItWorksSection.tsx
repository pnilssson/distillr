"use client";

import { BookOpen, Link2, MessageSquareText } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const steps = [
  {
    step: "01",
    icon: Link2,
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
    icon: MessageSquareText,
    title: "Ask anything",
    desc: "Chat with your videos in plain language. Get answers pulled directly from video transcripts, with timestamp-linked sources.",
  },
];

export function HowItWorksSection() {
  const shouldReduceMotion = !!useReducedMotion();
  const fadeUp = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion
        ? { duration: 0.2 }
        : { duration: 0.5, ease: "easeOut" as const },
    },
  };

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: shouldReduceMotion ? undefined : { staggerChildren: 0.12 },
    },
  };

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
          <motion.div
            key={step}
            className="group flex flex-col gap-4"
            variants={fadeUp}
            whileHover={
              shouldReduceMotion
                ? undefined
                : { y: -4, transition: { duration: 0.2, ease: "easeOut" } }
            }
          >
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

            <div className="relative mt-1 overflow-hidden rounded-xl border bg-card p-3">
              {step === "01" && (
                <>
                  <div className="rounded-lg border bg-muted/40 px-2 py-1.5">
                    <p className="truncate text-[11px] text-muted-foreground">
                      https://youtube.com/watch?v=R3searchAlpha
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <motion.span
                      className="h-2 w-2 rounded-full bg-primary"
                      animate={
                        shouldReduceMotion
                          ? undefined
                          : { opacity: [0.5, 1, 0.5], scale: [1, 1.22, 1] }
                      }
                      transition={
                        shouldReduceMotion
                          ? undefined
                          : {
                              duration: 2.6,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut",
                            }
                      }
                    />
                    Source added to Macro Research library
                  </div>
                </>
              )}

              {step === "02" && (
                <div className="space-y-2">
                  {["Transcript extraction", "Chunk indexing", "Embedding"].map((label, idx) => (
                    <div key={label}>
                      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
                      <div className="h-1.5 rounded-full bg-muted">
                        <motion.div
                          className="h-1.5 rounded-full bg-primary"
                          animate={
                            shouldReduceMotion
                              ? undefined
                              : { width: ["18%", "46%", "72%", "34%"] }
                          }
                          transition={
                            shouldReduceMotion
                              ? undefined
                              : {
                                  duration: 7.2,
                                  delay: idx * 0.45,
                                  repeat: Number.POSITIVE_INFINITY,
                                  ease: "easeInOut",
                                }
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === "03" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">What did they disagree on?</p>
                  <div className="rounded-lg border bg-muted/30 p-2 text-[11px] leading-relaxed">
                    Disagreement centers on adoption timelines, not core capability.
                  </div>
                  <div className="flex gap-1 text-[10px] text-muted-foreground">
                    <span className="rounded border bg-background px-1.5 py-0.5">#48 12:34</span>
                    <span className="rounded border bg-background px-1.5 py-0.5">#399 38:17</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
