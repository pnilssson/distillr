import * as Sentry from "@sentry/nextjs";

import { isLocalhostHostname } from "@/lib/analytics/posthog-runtime";

let hasReportedMissingPosthogClientConfig = false;

export function isPosthogClientEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  if (typeof window !== "undefined" && isLocalhostHostname(window.location.hostname)) {
    return false;
  }

  const hasPosthogKey = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
  const hasPosthogHost = Boolean(process.env.NEXT_PUBLIC_POSTHOG_HOST);

  if (!hasPosthogKey || !hasPosthogHost) {
    if (!hasReportedMissingPosthogClientConfig) {
      hasReportedMissingPosthogClientConfig = true;

      Sentry.captureMessage("PostHog client analytics disabled due to missing configuration.", {
        level: "error",
        tags: {
          area: "analytics.posthog.client",
        },
        extra: {
          missingNextPublicPosthogKey: !hasPosthogKey,
          missingNextPublicPosthogHost: !hasPosthogHost,
        },
      });
    }

    return false;
  }

  return true;
}
