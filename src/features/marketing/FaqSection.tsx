"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "What is Distillr?",
    answer:
      "Distillr is a YouTube research library. It indexes transcripts from channels, playlists, and videos you choose, so you can search and ask questions across your sources with cited answers and timestamp links.",
  },
  {
    question: "Do you have to be technical to use it?",
    answer:
      "No. You paste a YouTube URL. Distillr handles the rest. If you can use ChatGPT, you can use Distillr.",
  },
  {
    question: "How does Distillr work with YouTube?",
    answer:
      "Paste a YouTube channel URL, playlist URL, or individual video URL into Distillr. We automatically extract the video transcripts, process them with AI embeddings, and add them to your searchable knowledge base. New uploads from channels and playlists are picked up automatically.",
  },
  {
    question: "Which YouTube formats are supported?",
    answer:
      "Distillr supports YouTube channels, playlists, and individual videos. Once you add a channel or playlist, new uploads are indexed automatically so your knowledge base stays current.",
  },
  {
    question: "How long does it take to process a video?",
    answer:
      "Most videos are processed and ready to search within minutes. Processing time depends on video length and current queue, but you can typically start asking questions shortly after adding your sources.",
  },
  {
    question: "Is my library private?",
    answer:
      "Yes. Your libraries are private by default and tied to your account. Nothing you add is shared publicly or accessible to other users.",
  },
  {
    question: "Can I export my knowledge base data?",
    answer:
      "Yes. Distillr supports exports in Markdown, PDF, TXT, and full chat log formats, ready for Notion, Obsidian, or any note-taking tool you use.",
  },
  {
    question: "What is the credit system?",
    answer:
      "Credits are the unit used for AI chat. Each message costs credits depending on which AI model you choose, faster models cost fewer credits, more capable models cost more. Monthly credits reset on your billing date. Paid plans can buy 250-credit top-ups for $5.",
  },
  {
    question: "How are video limits counted?",
    answer:
      "Each indexed video counts as one video toward your monthly indexing allowance and your total stored video cap, regardless of video length.",
  },
  {
    question: "Does Distillr work with videos that have no subtitles?",
    answer:
      "Distillr relies on YouTube's auto-generated or manually uploaded transcripts. Most videos with spoken content have auto-generated transcripts available. Videos without any transcript (e.g. silent or music-only videos) cannot be indexed.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-6 py-24 lg:py-36">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-12 text-center"
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          FAQ
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl">
          Frequently asked questions
        </h2>
      </motion.div>

      <motion.dl
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="divide-y"
      >
        {faqs.map((faq, index) => (
          <div key={index}>
            <dt>
              <button
                className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-medium"
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                aria-expanded={openIndex === index}
              >
                <span>{faq.question}</span>
                {openIndex === index ? (
                  <Minus size={16} className="shrink-0 text-muted-foreground" />
                ) : (
                  <Plus size={16} className="shrink-0 text-muted-foreground" />
                )}
              </button>
            </dt>
            <AnimatePresence initial={false}>
              {openIndex === index && (
                <motion.dd
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </motion.dd>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.dl>
    </section>
  );
}
