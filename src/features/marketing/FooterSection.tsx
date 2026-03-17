"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { useCookieConsent } from "@/features/cookies/CookieConsentProvider";

export function FooterSection() {
  const { openPreferences } = useCookieConsent();

  return (
    <footer className="border-t">
      <motion.div
        className="mx-auto grid w-full max-w-5xl gap-12 px-6 py-16 text-sm text-muted-foreground md:gap-x-20 md:gap-y-14 md:grid-cols-[1.75fr_0.9fr_0.9fr] lg:py-24"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, ease: "easeOut" as const }}
      >
        <div className="space-y-4">
          <span className="font-semibold tracking-tight text-foreground">Distillr</span>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Research library for analysts, researchers, and writers using
            YouTube as a primary source.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-2.5 py-1">Private by default</span>
            <span className="rounded-full border px-2.5 py-1">Cited answers</span>
            <span className="rounded-full border px-2.5 py-1">Timestamp links</span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest">Product</p>
          <div className="flex flex-col gap-2.5">
            <Link href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </Link>
            <Link href="#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest">Legal</p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/cookies"
              className="transition-colors hover:text-foreground"
            >
              Cookies
            </Link>
            <button
              onClick={openPreferences}
              className="text-left transition-colors hover:text-foreground"
            >
              Cookie Preferences
            </button>
          </div>
        </div>

        <div className="md:col-span-3">
          <p className="text-xs">© Distillr</p>
        </div>
      </motion.div>
    </footer>
  );
}
