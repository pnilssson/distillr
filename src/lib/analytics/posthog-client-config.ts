import * as Sentry from "@sentry/nextjs";

let hasReportedMissingPosthogClientConfig = false;

export function hasPosthogClientConfig(): boolean {
  const hasPosthogKey = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
  const hasPosthogHost = Boolean(process.env.NEXT_PUBLIC_POSTHOG_HOST);

  if (hasPosthogKey && hasPosthogHost) {
    return true;
  }

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
