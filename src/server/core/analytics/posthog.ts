import "server-only";

import * as Sentry from "@sentry/nextjs";
import { PostHog } from "posthog-node";

import { env } from "@/server/core/env";

let posthogClient: PostHog | null = null;
let hasReportedMissingPosthogServerConfig = false;

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY || !env.POSTHOG_HOST) {
    reportMissingPosthogServerConfig();
    return;
  }

  const client = getPosthogClient();

  try {
    client.capture({
      distinctId,
      event,
      properties,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        area: "analytics.posthog.server.capture",
      },
      extra: {
        event,
        distinctId,
      },
    });

    console.error("PostHog capture failed", { event, distinctId, error });
  }
}

function reportMissingPosthogServerConfig() {
  if (hasReportedMissingPosthogServerConfig) {
    return;
  }

  hasReportedMissingPosthogServerConfig = true;

  Sentry.captureMessage("PostHog server analytics disabled due to missing configuration.", {
    level: "error",
    tags: {
      area: "analytics.posthog.server",
    },
    extra: {
      missingNextPublicPosthogKey: !env.NEXT_PUBLIC_POSTHOG_KEY,
      missingPosthogHost: !env.POSTHOG_HOST,
    },
  });
}

function getPosthogClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
      host: env.POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 10000,
    });
  }

  return posthogClient;
}
