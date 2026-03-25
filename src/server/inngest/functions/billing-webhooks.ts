import "server-only";

import { captureServerEvent } from "@/server/core/analytics/posthog";
import {
  getDistillrProductIds,
  rankPlan,
  resolvePlanByProductId,
  type DistillrPlan,
} from "@/server/billing/polar/config";
import {
  createPolarFreeSubscription,
  listPolarSubscriptions,
  revokePolarSubscription,
} from "@/server/billing/polar/client";
import { inngest } from "@/server/inngest/client";

type PolarWebhookPayload = {
  type?: string;
  event?: string;
  name?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
};

const PLAN_UPGRADE_REASONS = new Set([
  "purchase",
  "subscription_create",
  "subscription_update",
]);

export const billingWebhookReceived = inngest.createFunction(
  {
    id: "billing-webhook-received",
    retries: 4,
    idempotency: "event.data.webhookId",
  },
  { event: "billing.webhook.received" },
  async ({ event, step }) => {
    const webhookId = event.data.webhookId;
    const payload = event.data.payload;
    const eventType = getEventType(payload) ?? event.data.eventType;

    if (!eventType) {
      return {
        status: "ignored",
        reason: "missing_event_type",
        webhookId,
      };
    }

    const data = readObject(payload.data);
    const userId = data ? getExternalCustomerId(data) : null;
    const productIds = data ? getProductIds(data) : [];

    if (eventType === "order.paid") {
      if (!data) {
        return {
          status: "ignored",
          eventType,
          reason: "missing_order_payload",
          webhookId,
        };
      }

      if (!userId) {
        return {
          status: "ignored",
          eventType,
          reason: "missing_external_customer_id",
          webhookId,
        };
      }

      let sideEffects = 0;
      const products = getDistillrProductIds();

      if (products.topUpTier1 && productIds.includes(products.topUpTier1)) {
        await step.run("emit-top-up-purchased", async () => {
          await captureServerEvent(userId, "top_up_purchased", {
            source: "polar_webhook",
            webhook_id: webhookId,
            idempotency_key: `${webhookId}:top_up_purchased`,
          });
        });
        sideEffects += 1;
      }

      const billingReason = getOrderBillingReason(data);
      const upgradedPlan = resolveUpgradedPlan(productIds, billingReason);

      if (upgradedPlan) {
        await step.run("emit-plan-upgraded", async () => {
          await captureServerEvent(userId, "plan_upgraded", {
            plan: upgradedPlan,
            billing_reason: billingReason,
            source: "polar_webhook",
            webhook_id: webhookId,
            idempotency_key: `${webhookId}:plan_upgraded`,
          });
        });
        sideEffects += 1;

        const revoked = await step.run("revoke-lower-tier-subscriptions", async () => {
          return revokeLowerTierSubscriptions(userId, upgradedPlan);
        });
        sideEffects += revoked;
      }

      return {
        status: "processed",
        eventType,
        webhookId,
        sideEffects,
      };
    }

    if (eventType === "subscription.revoked") {
      let sideEffects = 0;

      if (userId) {
        const reprovisioned = await step.run("reprovision-free-if-needed", async () => {
          return reprovisionFreeSubscriptionIfNeeded(userId);
        });
        sideEffects += reprovisioned ? 1 : 0;
      }

      return {
        status: "processed",
        eventType,
        webhookId,
        sideEffects,
      };
    }

    if (
      eventType === "customer.state_changed" ||
      eventType === "subscription.created" ||
      eventType === "subscription.updated" ||
      eventType === "subscription.active" ||
      eventType === "subscription.canceled" ||
      eventType === "subscription.uncanceled" ||
      eventType === "subscription.past_due"
    ) {
      return {
        status: "processed",
        eventType,
        webhookId,
        sideEffects: 0,
      };
    }

    return {
      status: "ignored",
      eventType,
      webhookId,
      reason: "unhandled_event_type",
    };
  },
);

function resolveUpgradedPlan(
  productIds: string[],
  billingReason: string | null,
): DistillrPlan | null {
  if (!billingReason || !PLAN_UPGRADE_REASONS.has(billingReason)) {
    return null;
  }

  const uniquePlans = Array.from(
    new Set(productIds.map((productId) => resolvePlanByProductId(productId)).filter(Boolean)),
  );

  if (uniquePlans.includes("pro")) {
    return "pro";
  }

  if (uniquePlans.includes("builder")) {
    return "builder";
  }

  return null;
}

function getEventType(payload: PolarWebhookPayload): string | null {
  const raw = payload.type ?? payload.event ?? payload.name;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function getOrderBillingReason(data: Record<string, unknown>): string | null {
  const directReason = readString(data.billingReason) ?? readString(data.billing_reason);
  if (directReason) {
    return directReason;
  }

  const order = readObject(data.order);
  return order
    ? readString(order.billingReason) ?? readString(order.billing_reason)
    : null;
}

function getExternalCustomerId(data: Record<string, unknown>): string | null {
  const directExternalCustomerId =
    readString(data.externalCustomerId) ?? readString(data.external_customer_id);
  if (directExternalCustomerId) {
    return directExternalCustomerId;
  }

  const directExternalId = readString(data.externalId) ?? readString(data.external_id);
  if (directExternalId) {
    return directExternalId;
  }

  const customer = readObject(data.customer);
  if (customer) {
    const externalId =
      readString(customer.externalCustomerId) ??
      readString(customer.external_customer_id) ??
      readString(customer.externalId) ??
      readString(customer.external_id);
    if (externalId) {
      return externalId;
    }
  }

  const subscription = readObject(data.subscription);
  const subscriptionCustomer = subscription ? readObject(subscription.customer) : null;
  if (subscriptionCustomer) {
    const externalId =
      readString(subscriptionCustomer.externalCustomerId) ??
      readString(subscriptionCustomer.external_customer_id) ??
      readString(subscriptionCustomer.externalId) ??
      readString(subscriptionCustomer.external_id);
    if (externalId) {
      return externalId;
    }
  }

  const order = readObject(data.order);
  const orderCustomer = order ? readObject(order.customer) : null;
  if (orderCustomer) {
    const externalId =
      readString(orderCustomer.externalCustomerId) ??
      readString(orderCustomer.external_customer_id) ??
      readString(orderCustomer.externalId) ??
      readString(orderCustomer.external_id);
    if (externalId) {
      return externalId;
    }
  }

  return null;
}

function getProductIds(data: Record<string, unknown>): string[] {
  const ids = new Set<string>();

  addProductId(ids, data);
  addProductFromNestedObject(ids, data, "product");

  const subscription = readObject(data.subscription);
  if (subscription) {
    addProductId(ids, subscription);
    addProductFromNestedObject(ids, subscription, "product");
  }

  const order = readObject(data.order);
  if (order) {
    addProductId(ids, order);
    addProductFromNestedObject(ids, order, "product");
    addProductIdsFromItems(ids, order);
  } else {
    addProductIdsFromItems(ids, data);
  }

  return Array.from(ids);
}

function addProductIdsFromItems(ids: Set<string>, value: Record<string, unknown>): void {
  const items = readArray(value.items);
  for (const item of items) {
    const row = readObject(item);
    if (!row) {
      continue;
    }

    addProductId(ids, row);
    addProductFromNestedObject(ids, row, "product");
  }
}

function addProductFromNestedObject(
  ids: Set<string>,
  value: Record<string, unknown>,
  key: string,
): void {
  const nested = readObject(value[key]);
  if (!nested) {
    return;
  }

  const nestedId = readString(nested.id);
  if (nestedId) {
    ids.add(nestedId);
  }
}

function addProductId(ids: Set<string>, value: Record<string, unknown>): void {
  const productId = readString(value.productId) ?? readString(value.product_id);
  if (productId) {
    ids.add(productId);
  }
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function reprovisionFreeSubscriptionIfNeeded(userId: string): Promise<boolean> {
  const products = getDistillrProductIds();
  const freeProductId = products.free;

  if (!freeProductId) return false;

  const subscriptions = await listPolarSubscriptions({
    externalCustomerId: userId,
    active: true,
  });

  const hasActiveDistillrSubscription = subscriptions.some((subscription) =>
    resolvePlanByProductId(subscription.product_id),
  );

  if (hasActiveDistillrSubscription) return false;

  await createPolarFreeSubscription({
    externalCustomerId: userId,
    freeProductId,
    idempotencyKey: `distillr-free-reprovision-${userId}-${Date.now()}`,
  });

  return true;
}

async function revokeLowerTierSubscriptions(
  userId: string,
  upgradedPlan: DistillrPlan,
): Promise<number> {
  const subscriptions = await listPolarSubscriptions({
    externalCustomerId: userId,
    active: true,
  });

  const upgradedRank = rankPlan(upgradedPlan);
  let revoked = 0;

  for (const subscription of subscriptions) {
    const plan = resolvePlanByProductId(subscription.product_id);
    if (!plan) continue;

    if (rankPlan(plan) < upgradedRank) {
      await revokePolarSubscription(subscription.id);
      revoked += 1;
    }
  }

  return revoked;
}
