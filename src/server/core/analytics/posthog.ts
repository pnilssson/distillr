import "server-only";

import { PostHog } from "posthog-node";

import { env } from "@/server/core/env";

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }

  const client = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  client.capture({
    distinctId,
    event,
    properties,
  });

  await client.shutdown();
}
