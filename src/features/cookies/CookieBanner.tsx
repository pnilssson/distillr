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
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-md rounded-xl border bg-background p-4 shadow-xl sm:right-6 sm:bottom-6"
            role="dialog"
            aria-label="Cookie consent"
            aria-modal="false"
          >
            <div className="flex flex-col gap-4">
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

              <div className="flex flex-wrap items-center gap-2">
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
