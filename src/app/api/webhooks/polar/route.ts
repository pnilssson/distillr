import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import * as Sentry from "@sentry/nextjs";

import { env } from "@/server/core/env";
import { inngest } from "@/server/inngest/client";

export const runtime = "nodejs";

type PolarWebhookEvent = {
  type?: string;
  event?: string;
  name?: string;
  timestamp?: Date | string;
  data?: Record<string, unknown>;
};

type NormalizedWebhookPayload = {
  type?: string;
  event?: string;
  name?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
};

export async function POST(request: Request): Promise<Response> {
  if (!env.POLAR_WEBHOOK_SECRET) {
    return new Response("", { status: 503 });
  }

  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event: PolarWebhookEvent;

  try {
    event = validateEvent(body, headers, env.POLAR_WEBHOOK_SECRET) as PolarWebhookEvent;
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return new Response("", { status: 403 });
    }

    Sentry.captureException(error, {
      tags: {
        area: "polar.webhook.verify",
      },
    });

    return new Response("", { status: 400 });
  }

  const payload = normalizePayload(event);
  const eventType = getEventType(payload);

  if (!eventType) {
    return new Response("", { status: 202 });
  }

  const webhookId = resolveWebhookId(request.headers, body, payload, eventType);

  try {
    await inngest.send({
      name: "billing.webhook.received",
      data: {
        webhookId,
        eventType,
        payload,
      },
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        area: "polar.webhook.enqueue",
      },
      extra: {
        eventType,
        webhookId,
      },
    });

    return new Response("", { status: 500 });
  }

  return new Response("", { status: 202 });
}

function normalizePayload(event: PolarWebhookEvent): NormalizedWebhookPayload {
  const data = readObject(event.data);
  const timestamp =
    event.timestamp instanceof Date
      ? event.timestamp.toISOString()
      : typeof event.timestamp === "string"
        ? event.timestamp
        : undefined;

  return {
    type: event.type,
    event: event.event,
    name: event.name,
    timestamp,
    data: data ?? undefined,
  };
}

function getEventType(event: NormalizedWebhookPayload): string | null {
  const raw = event.type ?? event.event ?? event.name;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function resolveWebhookId(
  headers: Headers,
  rawBody: string,
  payload: NormalizedWebhookPayload,
  eventType: string,
): string {
  const fromHeaders =
    headers.get("webhook-id") ?? headers.get("svix-id") ?? headers.get("x-webhook-id");
  if (fromHeaders) {
    return fromHeaders;
  }

  const rawPayload = parseRawJsonObject(rawBody);
  const fromBody = rawPayload
    ? readString(rawPayload["webhook-id"]) ??
      readString(rawPayload.webhook_id) ??
      readString(rawPayload.webhookId) ??
      readString(rawPayload.id)
    : null;
  if (fromBody) {
    return fromBody;
  }

  const eventData = readObject(payload.data);
  const objectId = eventData
    ? readString(eventData.id) ??
      readString(eventData.order_id) ??
      readString(eventData.orderId) ??
      readString(eventData.subscription_id) ??
      readString(eventData.subscriptionId)
    : null;

  return `${eventType}:${payload.timestamp ?? "unknown"}:${objectId ?? "unknown"}`;
}

function parseRawJsonObject(rawBody: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return readObject(parsed);
  } catch {
    return null;
  }
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
