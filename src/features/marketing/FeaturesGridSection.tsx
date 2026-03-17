"use client";

import {
  Library,
  MessageSquare,
  Search,
  Download,
  Youtube,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";

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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export function FeaturesGridSection() {
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
          Most AI tools give you generic answers. Distillr builds a research
          library from the YouTube channels and playlists you actually follow,
          and lets you query all of it at once with cited, timestamp-linked
          answers.
          <br />
          <br />
          The manual version of this workflow already exists: watch a video,
          copy the transcript, paste it into an LLM, ask a question. It breaks
          at ten videos. Distillr does it properly, at scale, with memory.
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
            className="flex flex-col gap-2 rounded-xl border bg-card p-5"
            variants={fadeUp}
          >
            <Icon size={18} className="mb-1 text-muted-foreground" />
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {desc}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <motion.aside
        className="mt-10 rounded-xl border bg-card p-6 sm:p-7"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <h3 className="text-sm font-semibold">Built for a specific kind of researcher</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          You follow 10 to 20 YouTube channels seriously. Macro economists, tech
          analysts, long-form interviewers, domain specialists. You take notes.
          You paste transcripts. You lose track of what you heard and where.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Distillr is a library for those channels. Add them once. Query all of
          them. Get the answer and the timestamp.
        </p>
      </motion.aside>
    </section>
  );
}
