import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

import { isPosthogClientEnabled } from "@/lib/analytics/posthog-client-config";

Sentry.init({
  dsn: "https://fb48c176663a73a4cccd20c24618b4d7@o4508629590081536.ingest.de.sentry.io/4511027373080656",

  integrations: [
    Sentry.feedbackIntegration({
      // We trigger the form programmatically from the account menu,
      // so disable the default floating widget.
      autoInject: false,
      colorScheme: "system",
      formTitle: "Send feedback",
      submitButtonLabel: "Send feedback",
      messagePlaceholder: "What's on your mind? Bug reports, feature requests, anything goes.",
      themeLight: {
        accentBackground: "#d8f999",
        accentForeground: "#000000",
      },
      themeDark: {
        accentBackground: "#d8f999",
        accentForeground: "#000000",
      },
    }),
  ],

  // sendDefaultPii is intentionally omitted (defaults to false).
  // See sentry.server.config.ts for rationale.
});

if (isPosthogClientEnabled()) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    defaults: "2026-01-30",
    opt_out_capturing_by_default: true,
  });
}
