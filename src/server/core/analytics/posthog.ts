import "server-only";

import { PostHog } from "posthog-node";

import { env } from "@/server/core/env";

let posthogClient: PostHog | null = null;

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY || !env.NEXT_PUBLIC_POSTHOG_HOST) {
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
    console.error("PostHog capture failed", { event, distinctId, error });
  }
}

function getPosthogClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
      host: env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 10000,
    });
  }

  return posthogClient;
}
