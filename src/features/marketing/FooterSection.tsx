"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { useCookieConsent } from "@/features/cookies/CookieConsentProvider";

export function FooterSection() {
  const { openPreferences } = useCookieConsent();

  return (
    <footer className="border-t">
      <motion.div
        className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, ease: "easeOut" as const }}
      >
        <span className="font-semibold tracking-tight text-foreground">
          Distillr
        </span>
        <div className="flex flex-wrap gap-6">
          <Link
            href="#how-it-works"
            className="transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
        <div className="flex flex-wrap gap-6">
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
            className="transition-colors hover:text-foreground"
          >
            Cookie Preferences
          </button>
        </div>
      </motion.div>
    </footer>
  );
}
