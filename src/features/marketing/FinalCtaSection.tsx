"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

interface FinalCtaSectionProps {
  isAuthenticated?: boolean;
}

export function FinalCtaSection({ isAuthenticated }: FinalCtaSectionProps) {
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";
  const ctaLabel = isAuthenticated ? "Go to dashboard" : "Try it free";

  return (
    <section className="border-t mx-auto w-full max-w-3xl px-6 py-24 text-center lg:py-36">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <h2 className="mb-4 font-serif text-4xl leading-tight sm:text-5xl">
          Build your knowledge base in under a minute.
        </h2>
        <p className="mb-10 text-muted-foreground">
          Add your first channel or video and start asking questions. Free, no
          credit card.
        </p>
        <Button asChild size="lg" className="h-12 px-10 text-base">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          No credit card needed. Cancel anytime.
        </p>
      </motion.div>
    </section>
  );
}
