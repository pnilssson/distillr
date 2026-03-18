import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { AppError } from "@/server/core/errors/app-error";
import { getDistillrProductIds, isPolarBillingEnabled } from "@/server/billing/polar/config";
import {
  createPolarCustomer,
  createPolarFreeSubscription,
  getPolarCustomerByExternalId,
  getPolarCustomerStateByExternalId,
  listPolarSubscriptions,
} from "@/server/billing/polar/client";
import type { PolarCustomerState, PolarSubscriptionStatus } from "@/server/billing/polar/types";

type EnsurePolarCustomerProvisionedInput = {
  userId: string;
  email: string | null;
  name?: string | null;
};

const TERMINAL_SUBSCRIPTION_STATUSES = new Set<PolarSubscriptionStatus>([
  "canceled",
  "incomplete_expired",
]);

export async function ensurePolarCustomerProvisioned(
  input: EnsurePolarCustomerProvisionedInput,
): Promise<void> {
  if (!isPolarBillingEnabled()) {
    return;
  }

  await withProvisioningLock(input.userId, async () => {
    await ensurePolarCustomer(input);

    const products = getDistillrProductIds();
    const distillrProductIdSet = new Set(
      [products.free, products.builder, products.pro].filter((value): value is string => Boolean(value)),
    );

    if (distillrProductIdSet.size === 0) {
      throw new AppError({
        code: "BILLING_PRODUCTS_NOT_CONFIGURED",
        userMessage: "Could not set up billing right now. Please try again.",
        httpStatus: 503,
      });
    }

    if (await hasAnyProvisionedDistillrSubscription(input.userId, distillrProductIdSet)) {
      return;
    }

    const freeProductId = products.free;

    if (!freeProductId) {
      throw new AppError({
        code: "BILLING_FREE_PRODUCT_NOT_CONFIGURED",
        userMessage: "Could not set up billing right now. Please try again.",
        httpStatus: 503,
      });
    }

    try {
      await createPolarFreeSubscription({
        externalCustomerId: input.userId,
        freeProductId,
        idempotencyKey: `distillr-free-subscription-${input.userId}`,
      });
    } catch (error) {
      if (await hasAnyProvisionedDistillrSubscription(input.userId, distillrProductIdSet)) {
        return;
      }

      throw error;
    }

    if (!(await hasAnyProvisionedDistillrSubscription(input.userId, distillrProductIdSet))) {
      throw new AppError({
        code: "BILLING_SUBSCRIPTION_VERIFY_FAILED",
        userMessage: "Could not verify your billing status right now. Please try again.",
        httpStatus: 503,
      });
    }
  });
}

export async function getPolarCustomerState(userId: string): Promise<PolarCustomerState | null> {
  if (!isPolarBillingEnabled()) {
    return null;
  }

  return getPolarCustomerStateByExternalId(userId);
}

async function ensurePolarCustomer(input: EnsurePolarCustomerProvisionedInput): Promise<void> {
  const existingCustomer = await getPolarCustomerByExternalId(input.userId);

  if (existingCustomer) {
    return;
  }

  if (!input.email) {
    throw new AppError({
      code: "BILLING_CUSTOMER_EMAIL_REQUIRED",
      userMessage: "Could not set up billing right now. Please try again.",
      httpStatus: 503,
    });
  }

  try {
    await createPolarCustomer({
      externalCustomerId: input.userId,
      email: input.email,
      name: input.name,
      idempotencyKey: `distillr-customer-${input.userId}`,
    });
  } catch (error) {
    const customerAfterCreateFailure = await getPolarCustomerByExternalId(input.userId);

    if (!customerAfterCreateFailure) {
      throw error;
    }
  }
}

async function hasAnyProvisionedDistillrSubscription(
  userId: string,
  distillrProductIdSet: Set<string>,
): Promise<boolean> {
  const subscriptions = await listPolarSubscriptions({
    externalCustomerId: userId,
  });

  return subscriptions.some(
    (subscription) =>
      distillrProductIdSet.has(subscription.product_id) &&
      !TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status),
  );
}

async function withProvisioningLock<T>(userId: string, task: () => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('distillr-billing-provision'), hashtext(${userId}))`,
    );

    return task();
  });
}
