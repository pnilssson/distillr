"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useCookieConsent } from "./CookieConsentProvider";
import { CookiePreferencesDialog } from "./CookiePreferencesDialog";

export function CookieBanner() {
  const { consent, acceptAll, rejectAll, openPreferences } = useCookieConsent();

  const showBanner = consent === null;

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background px-4 py-4 shadow-lg sm:px-6"
            role="dialog"
            aria-label="Cookie consent"
            aria-modal="false"
          >
            <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                We use cookies to keep you signed in and, with your permission,
                to understand how Distillr is used.{" "}
                <Link
                  href="/cookies"
                  className="underline hover:text-foreground"
                >
                  Cookie Policy
                </Link>
              </p>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rejectAll}
                >
                  Reject all
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPreferences}
                >
                  Manage preferences
                </Button>
                <Button size="sm" onClick={acceptAll}>
                  Accept all
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CookiePreferencesDialog />
    </>
  );
}
