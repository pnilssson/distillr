"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCookieConsent } from "./CookieConsentProvider";

function Toggle({
  checked,
  disabled,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-primary" : "bg-input",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

export function CookiePreferencesDialog() {
  const { consent, updateConsent, isPreferencesOpen, setIsPreferencesOpen } =
    useCookieConsent();

  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    consent?.analytics ?? false,
  );

  useEffect(() => {
    if (isPreferencesOpen) {
      setAnalyticsEnabled(consent?.analytics ?? false);
    }
    // Sync from consent only when dialog opens, not on every consent change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreferencesOpen]);

  function handleOpenChange(open: boolean) {
    setIsPreferencesOpen(open);
  }

  function handleSave() {
    updateConsent({ analytics: analyticsEnabled });
    setIsPreferencesOpen(false);
  }

  return (
    <Dialog open={isPreferencesOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Manage which cookies you allow. You can change these settings at any
          time.{" "}
          <Link href="/cookies" className="underline hover:text-foreground">
            Cookie Policy
          </Link>
        </p>

        <div className="space-y-4 py-2">
          {/* Strictly Necessary */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Strictly Necessary</label>
              <p className="text-xs text-muted-foreground">
                Required for authentication and core functionality. Cannot be
                disabled.
              </p>
            </div>
            <Toggle
              id="necessary"
              checked={true}
              disabled={true}
              onCheckedChange={() => {}}
            />
          </div>

          <div className="border-t" />

          {/* Analytics */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <label htmlFor="analytics" className="text-sm font-medium">
                Analytics
              </label>
              <p className="text-xs text-muted-foreground">
                Helps us understand how the app is used so we can improve it
                (PostHog). No data is sold to third parties.
              </p>
            </div>
            <Toggle
              id="analytics"
              checked={analyticsEnabled}
              onCheckedChange={setAnalyticsEnabled}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setIsPreferencesOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save preferences</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
