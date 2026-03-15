import "server-only";

export type PolarCustomer = {
  id: string;
  email: string;
  external_id: string | null;
};

export type PolarCustomerStateMeter = {
  meter_id: string;
  consumed_units: number;
  credited_units: number;
  balance: number;
};

export type PolarCustomerStateSubscription = {
  id: string;
  product_id: string;
  status: "active" | "trialing";
};

export type PolarCustomerState = {
  id: string;
  external_id: string | null;
  active_subscriptions: PolarCustomerStateSubscription[];
  active_meters: PolarCustomerStateMeter[];
};

export type PolarCheckoutSession = {
  id: string;
  url: string;
};

export type PolarCustomerPortalSession = {
  id: string;
  customer_portal_url: string;
};

export type PolarEventIngestResponse = {
  inserted: number;
  duplicates?: number;
};

export type PolarIngestEvent = {
  name: string;
  externalCustomerId: string;
  externalId?: string;
  parentId?: string;
  metadata?: Record<string, string | number | boolean>;
  timestamp?: string;
};
