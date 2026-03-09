import "server-only";

import { PostHog } from "posthog-node";

import { env } from "@/server/core/env";

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY || !env.NEXT_PUBLIC_POSTHOG_HOST) {
    return;
  }

  const client = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    client.capture({
      distinctId,
      event,
      properties,
    });
  } catch (error) {
    console.error("PostHog capture failed", { event, distinctId, error });
  }

  try {
    await client.shutdown();
  } catch (error) {
    console.error("PostHog shutdown failed", { event, distinctId, error });
  }
}
