import "server-only";

import { AppError } from "@/server/core/errors/app-error";
import { env } from "@/server/core/env";
import { getPolarBaseUrl, isPolarBillingEnabled } from "@/server/billing/polar/config";
import type {
  PolarCheckoutSession,
  PolarCustomer,
  PolarCustomerPortalSession,
  PolarCustomerState,
  PolarEventIngestResponse,
  PolarIngestEvent,
} from "@/server/billing/polar/types";

const RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

type PolarRequestOptions = {
  allowNotFound?: boolean;
  idempotencyKey?: string;
  retries?: number;
};

type PolarHttpErrorPayload = {
  detail?: string;
  error?: string;
};

export async function getPolarCustomerByExternalId(
  externalCustomerId: string,
): Promise<PolarCustomer | null> {
  return polarRequest<PolarCustomer>(
    "GET",
    `/v1/customers/external/${encodeURIComponent(externalCustomerId)}`,
    undefined,
    {
      allowNotFound: true,
    },
  );
}

export async function createPolarCustomer(input: {
  externalCustomerId: string;
  email: string;
  name?: string | null;
  idempotencyKey?: string;
}): Promise<PolarCustomer> {
  const organizationId = env.POLAR_ORG_ID ?? undefined;

  return polarRequest<PolarCustomer>(
    "POST",
    "/v1/customers/",
    {
      external_id: input.externalCustomerId,
      email: input.email,
      name: input.name ?? undefined,
      organization_id: organizationId,
    },
    {
      idempotencyKey: input.idempotencyKey,
    },
  ).then((customer) => {
    if (!customer) {
      throw createPolarIntegrationError({
        code: "POLAR_CUSTOMER_CREATE_FAILED",
        message: "Could not create billing customer.",
      });
    }

    return customer;
  });
}

export async function getPolarCustomerStateByExternalId(
  externalCustomerId: string,
): Promise<PolarCustomerState | null> {
  return polarRequest<PolarCustomerState>(
    "GET",
    `/v1/customers/external/${encodeURIComponent(externalCustomerId)}/state`,
    undefined,
    {
      allowNotFound: true,
    },
  );
}

export async function createPolarFreeSubscription(input: {
  externalCustomerId: string;
  freeProductId: string;
  idempotencyKey?: string;
}): Promise<void> {
  await polarRequest(
    "POST",
    "/v1/subscriptions/",
    {
      external_customer_id: input.externalCustomerId,
      product_id: input.freeProductId,
    },
    {
      idempotencyKey: input.idempotencyKey,
    },
  );
}

export async function createPolarCheckoutSession(input: {
  externalCustomerId: string;
  productId: string;
  successUrl: string;
  returnUrl: string;
  idempotencyKey?: string;
}): Promise<PolarCheckoutSession> {
  const session = await polarRequest<PolarCheckoutSession>(
    "POST",
    "/v1/checkouts/",
    {
      external_customer_id: input.externalCustomerId,
      products: [input.productId],
      success_url: input.successUrl,
      return_url: input.returnUrl,
      organization_id: env.POLAR_ORG_ID ?? undefined,
    },
    {
      idempotencyKey: input.idempotencyKey,
    },
  );

  if (!session?.url) {
    throw createPolarIntegrationError({
      code: "POLAR_CHECKOUT_SESSION_MISSING_URL",
      message: "Could not start checkout right now.",
    });
  }

  return session;
}

export async function createPolarCustomerPortalSession(input: {
  externalCustomerId: string;
  returnUrl: string;
  idempotencyKey?: string;
}): Promise<PolarCustomerPortalSession> {
  const session = await polarRequest<PolarCustomerPortalSession>(
    "POST",
    "/v1/customer-sessions/",
    {
      external_customer_id: input.externalCustomerId,
      return_url: input.returnUrl,
    },
    {
      idempotencyKey: input.idempotencyKey,
    },
  );

  if (!session?.customer_portal_url) {
    throw createPolarIntegrationError({
      code: "POLAR_PORTAL_SESSION_MISSING_URL",
      message: "Could not open billing settings right now.",
    });
  }

  return session;
}

export async function ingestPolarEvent(
  event: PolarIngestEvent,
  options: { idempotencyKey?: string } = {},
): Promise<PolarEventIngestResponse> {
  return ingestPolarEvents([event], options);
}

export async function ingestPolarEvents(
  events: PolarIngestEvent[],
  options: { idempotencyKey?: string } = {},
): Promise<PolarEventIngestResponse> {
  return polarRequest<PolarEventIngestResponse>(
    "POST",
    "/v1/events/ingest",
    {
      events: events.map((event) => ({
        name: event.name,
        external_customer_id: event.externalCustomerId,
        external_id: event.externalId,
        parent_id: event.parentId,
        metadata: event.metadata,
        organization_id: env.POLAR_ORG_ID ?? undefined,
        timestamp: event.timestamp,
      })),
    },
    {
      idempotencyKey: options.idempotencyKey,
    },
  ).then((response) => {
    if (!response) {
      throw createPolarIntegrationError({
        code: "POLAR_EVENT_INGEST_FAILED",
        message: "Could not sync usage right now.",
      });
    }

    return response;
  });
}

async function polarRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  options: PolarRequestOptions = {},
): Promise<T | null> {
  if (!isPolarBillingEnabled() || !env.POLAR_ACCESS_TOKEN) {
    throw createPolarIntegrationError({
      code: "POLAR_NOT_CONFIGURED",
      message: "Billing is not configured yet.",
      retryable: false,
    });
  }

  const retryCount = options.retries ?? 2;
  const url = `${getPolarBaseUrl()}${path}`;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${env.POLAR_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });

      if (options.allowNotFound && response.status === 404) {
        return null;
      }

      if (response.ok) {
        return parseJson<T>(response);
      }

      if (RETRYABLE_STATUSES.has(response.status) && attempt < retryCount) {
        await delay(250 * (attempt + 1));
        continue;
      }

      const payload = (await parseJson<PolarHttpErrorPayload>(response)) ?? null;
      const detail = payload?.detail ?? payload?.error ?? `HTTP ${response.status}`;

      throw createPolarIntegrationError({
        code: "POLAR_REQUEST_FAILED",
        message: "Could not process billing right now. Please try again.",
        retryable: RETRYABLE_STATUSES.has(response.status),
        cause: new Error(`Polar API ${method} ${path} failed: ${detail}`),
      });
    } catch (error) {
      if (attempt < retryCount) {
        await delay(250 * (attempt + 1));
        continue;
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw createPolarIntegrationError({
        code: "POLAR_REQUEST_ERROR",
        message: "Could not process billing right now. Please try again.",
        retryable: true,
        cause: error,
      });
    }
  }

  throw createPolarIntegrationError({
    code: "POLAR_REQUEST_EXHAUSTED",
    message: "Could not process billing right now. Please try again.",
    retryable: true,
  });
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function createPolarIntegrationError(input: {
  code: string;
  message: string;
  retryable?: boolean;
  cause?: unknown;
}): AppError {
  return new AppError({
    code: input.code,
    userMessage: input.message,
    httpStatus: 502,
    retryable: input.retryable ?? false,
    cause: input.cause,
  });
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
