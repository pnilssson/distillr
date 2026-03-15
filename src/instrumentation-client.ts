import posthog from "posthog-js";

import { hasPosthogClientConfig } from "@/lib/analytics/posthog-client-config";

if (hasPosthogClientConfig()) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    defaults: "2026-01-30",
  });
}
