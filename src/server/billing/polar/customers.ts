import "server-only";

import { AppError } from "@/server/core/errors/app-error";
import { getDistillrProductIds, isPolarBillingEnabled } from "@/server/billing/polar/config";
import {
  createPolarCustomer,
  createPolarFreeSubscription,
  getPolarCustomerByExternalId,
  getPolarCustomerStateByExternalId,
} from "@/server/billing/polar/client";
import type { PolarCustomerState } from "@/server/billing/polar/types";

type EnsurePolarCustomerStateInput = {
  userId: string;
  email: string | null;
  name?: string | null;
};

export async function ensurePolarCustomerState(
  input: EnsurePolarCustomerStateInput,
): Promise<PolarCustomerState | null> {
  if (!isPolarBillingEnabled()) {
    return null;
  }

  const existingCustomer = await getPolarCustomerByExternalId(input.userId);

  if (!existingCustomer) {
    if (!input.email) {
      throw new AppError({
        code: "BILLING_CUSTOMER_EMAIL_REQUIRED",
        userMessage: "Could not set up billing right now. Please try again.",
        httpStatus: 503,
      });
    }

    await createPolarCustomer({
      externalCustomerId: input.userId,
      email: input.email,
      name: input.name,
      idempotencyKey: `distillr-customer-${input.userId}`,
    });
  }

  let state = await getPolarCustomerStateByExternalId(input.userId);

  if (!state) {
    throw new AppError({
      code: "BILLING_STATE_UNAVAILABLE",
      userMessage: "Could not verify your billing status right now. Please try again.",
      httpStatus: 503,
    });
  }

  if (!hasAnyDistillrSubscription(state)) {
    const freeProductId = getDistillrProductIds().free;

    if (!freeProductId) {
      throw new AppError({
        code: "BILLING_FREE_PRODUCT_NOT_CONFIGURED",
        userMessage: "Could not set up billing right now. Please try again.",
        httpStatus: 503,
      });
    }

    await createPolarFreeSubscription({
      externalCustomerId: input.userId,
      freeProductId,
      idempotencyKey: `distillr-free-subscription-${input.userId}`,
    });

    state = await getPolarCustomerStateByExternalId(input.userId);

    if (!state) {
      throw new AppError({
        code: "BILLING_STATE_REFRESH_FAILED",
        userMessage: "Could not verify your billing status right now. Please try again.",
        httpStatus: 503,
      });
    }
  }

  return state;
}

export async function getPolarCustomerState(userId: string): Promise<PolarCustomerState | null> {
  if (!isPolarBillingEnabled()) {
    return null;
  }

  return getPolarCustomerStateByExternalId(userId);
}

function hasAnyDistillrSubscription(state: PolarCustomerState): boolean {
  const products = getDistillrProductIds();
  const distillrProductIdSet = new Set(
    [products.free, products.builder, products.pro].filter((value): value is string => Boolean(value)),
  );

  if (distillrProductIdSet.size === 0) {
    return false;
  }

  return state.active_subscriptions.some((subscription) =>
    distillrProductIdSet.has(subscription.product_id),
  );
}
