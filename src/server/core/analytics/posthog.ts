import "server-only";

import * as Sentry from "@sentry/nextjs";
import { PostHog } from "posthog-node";

import { isLocalhostUrl } from "@/lib/analytics/posthog-runtime";
import { env } from "@/server/core/env";

let posthogClient: PostHog | null = null;
let hasReportedMissingPosthogServerConfig = false;

type CaptureServerEventOptions = {
  immediate?: boolean;
};

type PosthogClientWithImmediateCapture = PostHog & {
  captureImmediate?: (payload: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }) => Promise<unknown>;
  flush?: () => Promise<unknown>;
};

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
  options?: CaptureServerEventOptions,
) {
  if (isPosthogServerDisabled()) {
    return;
  }

  if (!env.NEXT_PUBLIC_POSTHOG_KEY || !env.POSTHOG_HOST) {
    reportMissingPosthogServerConfig();
    return;
  }

  const client = getPosthogClient();

  try {
    const payload = {
      distinctId,
      event,
      properties,
    };

    if (options?.immediate) {
      const clientWithImmediateCapture = client as PosthogClientWithImmediateCapture;

      if (typeof clientWithImmediateCapture.captureImmediate === "function") {
        await clientWithImmediateCapture.captureImmediate(payload);
        return;
      }

      client.capture(payload);

      if (typeof clientWithImmediateCapture.flush === "function") {
        await clientWithImmediateCapture.flush();
      }

      return;
    }

    client.capture(payload);
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

function isPosthogServerDisabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return isLocalhostUrl(env.NEXT_PUBLIC_APP_URL);
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
