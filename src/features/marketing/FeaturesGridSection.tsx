"use client";

import {
  Library,
  MessageSquare,
  Search,
  Download,
  Youtube,
  Shield,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const features = [
  {
    icon: Library,
    title: "Persistent libraries",
    desc: "Add once, search forever. Your libraries grow as you add more channels, playlists, and videos.",
  },
  {
    icon: MessageSquare,
    title: "Cross-video chat",
    desc: "Chat with your entire video library using AI. Answers come directly from your video transcripts, not generic internet knowledge.",
  },
  {
    icon: Search,
    title: "Semantic transcript search",
    desc: "Search YouTube video transcripts by meaning, not just keywords. Surface insights you forgot you saved.",
  },
  {
    icon: Download,
    title: "Structured exports",
    desc: "Export summaries, transcripts, and chat logs to Markdown, PDF, or TXT, ready for Notion, Obsidian, or wherever you work.",
  },
  {
    icon: Youtube,
    title: "Channels and playlists",
    desc: "Add entire YouTube channels or playlists. New uploads are indexed automatically to keep your knowledge base current.",
  },
  {
    icon: Shield,
    title: "Private by default",
    desc: "Your libraries are private to your account. Nothing you add is shared or publicly accessible.",
  },
];

export function FeaturesGridSection() {
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
      transition: shouldReduceMotion ? undefined : { staggerChildren: 0.07 },
    },
  };

  return (
    <section
      id="features"
      className="border-t mx-auto w-full max-w-5xl px-6 py-24 lg:py-36"
    >
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Features
        </p>
        <h2 className="mb-6 max-w-md font-serif text-3xl sm:text-4xl">
          Built for knowledge that compounds
        </h2>
        <p className="max-w-2xl leading-relaxed text-muted-foreground">
          Distillr turns the channels and playlists you already follow into a
          private research library you can query in one place.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-xs font-medium text-foreground">
          <Shield size={14} className="text-muted-foreground" />
          Private by default - your sources stay private to your account.
        </div>
      </motion.div>

      <motion.div
        className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
      >
        {features.map(({ icon: Icon, title, desc }) => (
          <motion.div
            key={title}
            className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-card p-5"
            variants={fadeUp}
            whileHover={
              shouldReduceMotion
                ? undefined
                : { y: -6, scale: 1.01, transition: { duration: 0.22, ease: "easeOut" } }
            }
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <Icon size={18} className="mb-1 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
