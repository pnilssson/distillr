import { getApiErrorMessage, parseJsonResponse } from "@/lib/http/response";
import type {
  BillingCheckoutSource,
  BillingCheckoutTarget,
  BillingState,
} from "@/features/billing/types";

export async function fetchBillingState(): Promise<BillingState> {
  const response = await fetch("/api/billing/state", {
    method: "GET",
  });

  const payload = await parseJsonResponse<BillingState | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not load billing status."));
  }

  if (!payload || !("plan" in payload)) {
    throw new Error("Could not load billing status.");
  }

  return payload;
}

export async function createCheckoutSession(
  target: BillingCheckoutTarget,
  returnPath?: string,
  source: BillingCheckoutSource = "checkout",
): Promise<string> {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target,
      returnPath,
      source,
    }),
  });

  const payload = await parseJsonResponse<{ url: string } | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not start checkout right now."));
  }

  if (!payload || !("url" in payload) || typeof payload.url !== "string") {
    throw new Error("Could not start checkout right now.");
  }

  return payload.url;
}

export async function createCustomerPortalSession(returnPath?: string): Promise<string> {
  const response = await fetch("/api/billing/portal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      returnPath,
    }),
  });

  const payload = await parseJsonResponse<{ url: string } | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not open billing settings right now."));
  }

  if (!payload || !("url" in payload) || typeof payload.url !== "string") {
    throw new Error("Could not open billing settings right now.");
  }

  return payload.url;
}
