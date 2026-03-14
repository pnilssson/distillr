# Polar-First Billing Implementation Plan

## Goal

Integrate Polar.sh for Distillr monetization with a Polar-first approach:

- Keep subscription, benefits, and meter state in Polar as the source of truth.
- Support tiers (Free, Builder, Pro), monthly credit allowances, and top-ups.
- Enforce credit checks in the existing chat backend before model calls.
- Ingest usage after successful model calls so meter balances stay accurate.
- Separate setup work between user-owned Polar configuration and DOER code changes.

## Plan Overview

- Entitlements and meter balances live in Polar.
- The app enforces usage by reading Polar customer state before expensive work.
- Chat cost/usage events are ingested into Polar meters after completion.
- Webhooks trigger sync and cache invalidation, without mirroring full entitlement state.

## User Actions (Polar Dashboard / Account)

- Create products/prices for `Builder` and `Pro` monthly subscriptions.
- Configure benefits per tier, including feature flags and monthly credit allowances.
- Configure one-time top-up products that grant meter credits.
- Configure meter(s) for credit consumption (recommended: one internal credit unit).
- Set webhook endpoint URL and signing secret.
- Generate a Polar API token with minimal required scopes.
- Decide mapping constants (example: `$1 = 100 credits`) and set tier/top-up amounts.
- Confirm external customer mapping policy: `external_customer_id = app user id`.

## Polar Dashboard Copy/Paste Values

Use these exact values in the Polar UI so naming is consistent with implementation.

### 1) Create Meter (matches your first screenshot)

- Name: `Distillr AI Credits Consumed`
- Filters - Condition group:
  - Field: `Name`
  - Operator: `equals`
  - Event name: `distillr.chat.credits_consumed`
- Aggregation: `Sum`
- Sum property: `credits_used`

Notes:

- If the UI asks for unit label, use `credits`.
- Do not use `Count` for this meter, because credit burn per request is variable.

### 2) Create Benefit (matches your second screenshot)

Benefit type for all entries below: `Meter Credits`

- Builder monthly benefit
  - Description: `Builder monthly credits (1000)`
  - Meter: `Distillr AI Credits Consumed`
  - Credits amount: `1000`
  - Grant schedule: `Every billing cycle`

- Pro monthly benefit
  - Description: `Pro monthly credits (4000)`
  - Meter: `Distillr AI Credits Consumed`
  - Credits amount: `4000`
  - Grant schedule: `Every billing cycle`

- Top-up benefit
  - Description: `Top-up credits pack (500)`
  - Meter: `Distillr AI Credits Consumed`
  - Credits amount: `500`
  - Grant schedule: `One-time`

### 3) Product names and prices

Create these products in Polar:

- `Distillr Builder`
  - Billing: `Recurring subscription`
  - Interval: `Every 1 month`
  - Price: `EUR 17` (or your chosen settlement currency equivalent)
  - Attach benefit: `Builder monthly credits (1000)`

- `Distillr Pro`
  - Billing: `Recurring subscription`
  - Interval: `Every 1 month`
  - Price: `EUR 39` (or your chosen settlement currency equivalent)
  - Attach benefit: `Pro monthly credits (4000)`

- `Distillr Credit Top-up 500`
  - Billing: `One-time purchase`
  - Price: `EUR 5` (or your chosen settlement currency equivalent)
  - Attach benefit: `Top-up credits pack (500)`

Free plan is app-default and does not need a paid Polar product.

### 4) IDs to save after creation

Record these from Polar and map them into env vars during implementation:

- Builder product/price IDs
- Pro product/price IDs
- Top-up product/price IDs
- Meter ID for `Distillr AI Credits Consumed`

## DOER Actions (Codebase)

### Env and Config

- Add Polar env vars in `src/server/core/env.ts`:
  - `POLAR_ACCESS_TOKEN`
  - `POLAR_WEBHOOK_SECRET`
  - `POLAR_ORG_ID`
  - `POLAR_ENV`
  - Product/price IDs and meter/event identifiers

### Polar Client

- Add `src/server/billing/polar/client.ts` with typed API wrappers, retry behavior, idempotency keys, and provider-agnostic app errors.

### Customer Identity Bridge

- Resolve Polar customer by `external_customer_id` (the app user id) on all billing paths.
- Add lazy create/fetch helper in `src/server/billing/polar/customers.ts`.

### Checkout and Portal Routes

- Add authenticated API routes for:
  - Checkout session creation (plan upgrade and top-up)
  - Customer portal session creation
- Reuse auth utilities from `src/server/core/auth/api.ts`.

### Entitlement and Credit Enforcement

- Replace stub logic in `src/server/billing/credits.ts`:
  - Preflight read of Polar customer state and meter balance
  - Deny when credits are insufficient
  - Keep upgrade-prompt path in chat flow
- Keep user-facing error messages provider-agnostic.

### Usage Ingestion

- After successful model call and cost calculation, ingest a usage event to Polar with an idempotency key.
- Wire this in `src/server/chat/service.ts` where cost already exists.

### Webhooks

- Add `/api/webhooks/polar` route:
  - Verify signatures
  - Handle `customer.state_changed` and relevant billing events
  - Fast ACK
  - Idempotent processing
  - Cache invalidation where applicable

### Local Persistence

- Do not mirror subscription state in local DB.
- Optionally persist only operational records for webhook/event idempotency and audit.
- If schema changes are needed, define in Drizzle and generate migrations.

### UI Wiring

- Wire upgrade CTAs in pricing/chat UI to checkout routes.
- Add a manage billing action that opens customer portal.

### Observability

- Track relevant billing lifecycle events in PostHog (`upgrade_clicked`, `plan_upgraded`, and top-up purchase event if added).
- Log Polar API failures to Sentry with technical context.
- Keep user-facing errors clean and provider-agnostic.

### Tests

- Unit tests for entitlement checks, insufficient-credits path, and idempotency.
- Integration tests for webhook verification/processing and auth-protected checkout/portal routes.

## Acceptance Criteria

- Chat requests are blocked before model invocation when Polar balance is insufficient.
- Successful chat usage is ingested into Polar exactly once (idempotent retries).
- Tier upgrades and top-ups are purchasable via in-app checkout flow.
- Customer portal access is available from the app.
- No local subscription-state mirror exists, aside from optional operational idempotency logs.
- Webhook signature verification and replay-safe handling are implemented.
- Existing `$ai_generation` analytics remain intact.
- User-facing errors remain provider-agnostic.

## Execution Checklist (DOER)

- [ ] Add Polar env schema and validation in `src/server/core/env.ts`
- [ ] Implement Polar client and customer helpers in `src/server/billing/polar/`
- [ ] Implement checkout and customer portal routes
- [ ] Replace `src/server/billing/credits.ts` stub with Polar state enforcement
- [ ] Wire usage ingestion from `src/server/chat/service.ts`
- [ ] Add webhook route with signature verification and idempotent processing
- [ ] Wire UI CTAs to billing endpoints
- [ ] Add/update PostHog and Sentry instrumentation
- [ ] Add unit and integration tests
- [ ] Update affected docs
