"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import posthog from "posthog-js";

import { isPosthogClientEnabled } from "@/lib/analytics/posthog-client-config";

const CONSENT_KEY = "distillr-cookie-consent";
const CONSENT_VERSION = "1";

export interface CookieConsent {
  analytics: boolean;
  version: string;
  timestamp: string;
}

interface CookieConsentContextValue {
  consent: CookieConsent | null;
  acceptAll: () => void;
  rejectAll: () => void;
  updateConsent: (updates: Partial<Pick<CookieConsent, "analytics">>) => void;
  openPreferences: () => void;
  isPreferencesOpen: boolean;
  setIsPreferencesOpen: (open: boolean) => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used inside CookieConsentProvider");
  return ctx;
}

function applyPosthogConsent(analytics: boolean) {
  if (!isPosthogClientEnabled()) {
    return;
  }

  if (analytics) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

function saveConsent(consent: CookieConsent) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

function loadConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const stored = loadConsent();
      if (stored) {
        setConsent(stored);
        applyPosthogConsent(stored.analytics);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const persist = useCallback((next: CookieConsent) => {
    setConsent(next);
    saveConsent(next);
    applyPosthogConsent(next.analytics);
  }, []);

  const acceptAll = useCallback(() => {
    persist({
      analytics: true,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    });
  }, [persist]);

  const rejectAll = useCallback(() => {
    persist({
      analytics: false,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    });
  }, [persist]);

  const updateConsent = useCallback(
    (updates: Partial<Pick<CookieConsent, "analytics">>) => {
      const base = consent ?? {
        analytics: false,
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
      };
      persist({ ...base, ...updates, timestamp: new Date().toISOString() });
    },
    [consent, persist],
  );

  const openPreferences = useCallback(() => setIsPreferencesOpen(true), []);

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        acceptAll,
        rejectAll,
        updateConsent,
        openPreferences,
        isPreferencesOpen,
        setIsPreferencesOpen,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}
