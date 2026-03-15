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
- Webhooks are validated and forwarded to Inngest for replay-safe async processing, without mirroring full entitlement state.

## User Actions (Polar Dashboard / Account)

- Create products for `Free`, `Builder`, and `Pro` monthly subscriptions.
- Configure benefits per tier, including monthly chat credits and monthly video ingestion allowances.
- Configure one-time top-up products that grant chat meter credits.
- Configure meter(s) for chat and video usage tracking.
- Set webhook endpoint URL and signing secret.
- Generate a Polar API token with minimal required scopes.
- Decide mapping constants (example: `$1 = 100 credits`) and set tier/top-up amounts in USD.
- Confirm external customer mapping policy: `external_customer_id = app user id`.

## Polar Dashboard Copy/Paste Values

Use these exact values in the Polar UI so naming is consistent with implementation.

### 1) Tier limits to implement

| Tier | Chat credits / month | Videos / month | Total videos cap |
| --- | --- | --- | --- |
| Free | 100 | 10 | 50 |
| Builder | 1000 | 100 | 1000 |
| Pro | 4000 | 300 | Unlimited |

### 2) Create meters (all tiers)

Create these 3 meters:

- Meter A - chat credits consumed
  - Name: `Distillr Chat Credits Used`
  - Filters - Condition group:
    - Field: `Name`
    - Operator: `equals`
    - Event name: `distillr.chat.credits_consumed`
  - Aggregation: `Sum`
  - Sum property: `credits_used`

- Meter B - videos consumed monthly
  - Name: `Distillr Videos Ingested Monthly`
  - Filters - Condition group:
    - Field: `Name`
    - Operator: `equals`
    - Event name: `distillr.video.ingested`
  - Aggregation: `Sum`
  - Sum property: `units`

- Meter C - videos consumed lifetime
  - Name: `Distillr Videos Ingested Lifetime`
  - Filters - Condition group:
    - Field: `Name`
    - Operator: `equals`
    - Event name: `distillr.video.ingested`
  - Aggregation: `Sum`
  - Sum property: `units`

Notes:

- If the UI asks for unit label, use `credits` for chat and `videos` for video meters.
- Do not use `Count` for these meters.
- Meter B and Meter C can use the same event name and property. They diverge by how credits are granted.

### 3) Create benefits

Benefit type for all entries below: `Meter Credits`

- Free monthly chat benefit
  - Description: `Free chat monthly (100)`
  - Meter: `Distillr Chat Credits Used`
  - Credits amount: `100`
  - Grant schedule: `Every billing cycle`
  - Rollover unused credits: `Off`

- Free monthly video benefit
  - Description: `Free videos monthly (10)`
  - Meter: `Distillr Videos Ingested Monthly`
  - Credits amount: `10`
  - Grant schedule: `Every billing cycle`
  - Rollover unused credits: `Off`

- Builder monthly chat benefit
  - Description: `Builder chat monthly (1000)`
  - Meter: `Distillr Chat Credits Used`
  - Credits amount: `1000`
  - Grant schedule: `Every billing cycle`
  - Rollover unused credits: `Off`

- Builder monthly video benefit
  - Description: `Builder videos monthly (100)`
  - Meter: `Distillr Videos Ingested Monthly`
  - Credits amount: `100`
  - Grant schedule: `Every billing cycle`
  - Rollover unused credits: `Off`

- Pro monthly chat benefit
  - Description: `Pro chat monthly (4000)`
  - Meter: `Distillr Chat Credits Used`
  - Credits amount: `4000`
  - Grant schedule: `Every billing cycle`
  - Rollover unused credits: `Off`

- Pro monthly video benefit
  - Description: `Pro videos monthly (300)`
  - Meter: `Distillr Videos Ingested Monthly`
  - Credits amount: `300`
  - Grant schedule: `Every billing cycle`
  - Rollover unused credits: `Off`

- Top-up benefit
  - Description: `Top-up credits pack (500)`
  - Meter: `Distillr Chat Credits Used`
  - Credits amount: `500`
  - Grant schedule: `One-time`
  - Rollover unused credits: `Off`

### 4) Product names and prices

Create these products in Polar:

- `Distillr Free`
  - Description: `Starter plan with monthly credits and strict ingestion limits.`
  - Billing: `Recurring subscription`
  - Interval: `Every 1 month`
  - Currency: `USD`
  - Price: `USD 0`
  - Attach benefits:
    - `Free chat monthly (100)`
    - `Free videos monthly (10)`

- `Distillr Builder`
  - Description: `Build a serious video knowledge base with higher monthly limits and AI chat credits.`
  - Billing: `Recurring subscription`
  - Interval: `Every 1 month`
  - Currency: `USD`
  - Price: `USD 17`
  - Attach benefits:
    - `Builder chat monthly (1000)`
    - `Builder videos monthly (100)`

- `Distillr Pro`
  - Description: `For heavy research workflows with high monthly ingestion limits and a large chat credit balance.`
  - Billing: `Recurring subscription`
  - Interval: `Every 1 month`
  - Currency: `USD`
  - Price: `USD 39`
  - Attach benefits:
    - `Pro chat monthly (4000)`
    - `Pro videos monthly (300)`

- `Distillr Credit Top-up 500`
  - Description: `Adds 500 AI chat credits instantly for additional usage in the current billing cycle.`
  - Billing: `One-time purchase`
  - Currency: `USD`
  - Price: `USD 5`
  - Attach benefit: `Top-up credits pack (500)`

Free users must have an actual Polar subscription on `Distillr Free`.

### 5) Lifetime cap enforcement policy (50/1000/unlimited)

- Free lifetime cap target: 50 videos
- Builder lifetime cap target: 1000 videos
- Pro lifetime cap target: unlimited (skip lifetime cap checks)

Recommended implementation:

- Keep a single lifetime usage meter (`Distillr Videos Ingested Lifetime`) for all tiers.
- Ingest `distillr.video.ingested` events with `units=1` only after successful video ingest completion.
- Read `consumed_units` from lifetime meter in customer state.
- Enforce remaining lifetime allowance as `tier_cap - consumed_units` for Free and Builder.
- Treat Pro as unlimited lifetime cap.

### 6) IDs to save after creation

Record these from Polar and map them into env vars during implementation:

- Free product ID
- Builder product ID
- Pro product ID
- Top-up product ID
- Meter ID for `Distillr Chat Credits Used`
- Meter ID for `Distillr Videos Ingested Monthly`
- Meter ID for `Distillr Videos Ingested Lifetime`

Current implementation uses product IDs for free provisioning and checkout flows.
Price IDs are not required.

### 7) Webhook URL and event permissions

Create one webhook endpoint with these values:

- Name: `Distillr Billing Webhook (Production)`
- URL (production): `https://distillr.co/api/webhooks/polar`
- Format: `Raw`
- Secret: generate and store as `POLAR_WEBHOOK_SECRET`
- Delivery: keep retries enabled (default)

Subscribe to these events:

- Required:
  - `customer.state_changed`
- Recommended:
  - `subscription.created`
  - `subscription.updated`
  - `subscription.canceled`
  - `subscription.revoked`
  - `order.paid`
  - `order.refunded`

Webhook handling notes:

- Validate signatures using Polar SDK webhook validator (Standard Webhooks spec).
- Keep webhook handler fast and return quickly; process heavy work async.
- Polar retries failed deliveries up to 10 times and can disable endpoints after repeated failures.

### 8) Polar API token permissions (Organization Access Token)

Create one server-side token with these scopes:

- Name: `Distillr Server API Token (Production)`
- `checkouts:write`
- `customer_sessions:write`
- `customers:write`
- `subscriptions:write`
- `events:write`

Optional:

- `customer_meters:read` (only needed if you query customer meters directly instead of customer state)

`subscriptions:write` is required to auto-provision `Distillr Free` subscriptions via API.

### 9) Free user provisioning behavior

On first app usage for a new user:

- Ensure Polar customer exists (`external_customer_id = app user id`).
- Ensure active subscription exists on `Distillr Free`.
- If missing, create via `POST /v1/subscriptions/` (free products only).

### 10) Payout account review - copy/paste answers

Use these answers in the Polar review form.

- Organization Name: `Distillr`
- Support Email: `support@distillr.co`
- Website: `https://distillr.co`
- Social Media: your personal profile links used for verification (for example LinkedIn + X)

Describe your business:

`Distillr is a SaaS product in the AI productivity and research space. We help researchers, creators, consultants, and lifelong learners turn YouTube videos into a searchable knowledge base. Users connect channels, playlists, or videos, and Distillr extracts transcripts, generates structured insights, and enables source-linked chat across their library.`

What do you sell? Include type and features that are granted:

`We sell tiered SaaS subscriptions (Free, Builder, Pro) and one-time credit top-ups. Paid plans increase monthly ingestion limits and grant monthly AI chat credits. Customers get library-based video ingestion, cross-video semantic retrieval, timestamp-linked answers, and export features. Top-ups add extra AI credits for additional chat usage in the current cycle.`

How will you integrate Polar into your business?

`Polar powers checkout, subscription billing, free plan provisioning, one-time top-ups, and customer portal access inside Distillr. Our backend creates free subscriptions programmatically for new users, creates checkout and portal sessions via API, enforces meter balances before AI or ingestion work, and ingests usage events to Polar meters after successful requests. We also process Polar webhooks to react to customer state and subscription changes.`

Main customer acquisition channels:

- `Website & SEO`
- `Social media`
- `Email marketing`

Currently using:

- Select `This is my first payment platform` only if true.
- If not true, select the existing provider option and enter the actual provider.

Expected annual revenue:

- Enter a truthful estimate in USD.
- If you need an initial conservative estimate, use `50000 USD`.

## DOER Actions (Codebase)

### Env and Config

- Add Polar env vars in `src/server/core/env.ts`:
  - `POLAR_ACCESS_TOKEN`
  - `POLAR_WEBHOOK_SECRET`
  - `POLAR_ORG_ID`
  - `POLAR_ENV`
  - Free/Builder/Pro/top-up product IDs
  - Meter IDs and event identifiers
  - `POLAR_CHAT_CREDITS_PER_USD` (default `100`)

### Polar Client

- Add `src/server/billing/polar/client.ts` with typed API wrappers, retry behavior, idempotency keys, and provider-agnostic app errors.

### Customer Identity Bridge

- Resolve Polar customer by `external_customer_id` (the app user id) on all billing paths.
- Add lazy create/fetch helper in `src/server/billing/polar/customers.ts`.

### Free User Provisioning

- On first authenticated interaction, ensure:
  - Polar customer exists
  - active free subscription exists (`Distillr Free`)
- Use `POST /v1/subscriptions/` for free-product subscription creation.
- Do not use checkout for free provisioning.

### Checkout and Portal Routes

- Add authenticated API routes for:
  - Checkout session creation (plan upgrade and top-up)
  - Customer portal session creation
- Build success/return URLs from `NEXT_PUBLIC_APP_URL` (no hard-coded app domains in route handlers).
- Reuse auth utilities from `src/server/core/auth/api.ts`.

### Entitlement and Credit Enforcement

- Replace stub logic in `src/server/billing/credits.ts`:
  - Preflight read of Polar customer state and meter balances
  - Deny when chat credits are insufficient
  - Deny when monthly video allowance is insufficient
  - Deny when lifetime video allowance is insufficient (except Pro)
  - Keep upgrade-prompt path in chat flow
- Keep user-facing error messages provider-agnostic.

### Ingestion Cap Enforcement

- Add ingestion gating before queueing videos from a source:
  - determine remaining monthly video units from meter state
  - determine remaining lifetime video units from meter state (non-Pro)
  - enqueue only allowed count
  - mark overflow items failed with provider-agnostic limit reasons
- Keep limits enforced server-side only.
- Serialize source planning per user in Inngest (`source.added` concurrency key on `userId`) so allowance snapshots are not evaluated concurrently.

### Usage Ingestion

- Emit usage events from hot paths to Inngest workers:
  - `billing.usage.chat.record`
  - `billing.usage.video.record`
- Perform Polar `events.ingest` calls only inside Inngest billing workers.
- Use deterministic idempotency keys (`external_id`) so retries and replays do not double-count usage.
- Add a scheduled reconciliation worker to replay recent chat/video usage events in case event dispatch fails.
- Reconciliation should page deterministically by timestamp + id cursor until a run budget is reached, instead of a single fixed top-N query.
- Reconciliation should derive `totalTokens` as `inputTokens + outputTokens` when `totalTokens` is null.

### Lifetime Cap Handling

- Enforce lifetime caps from meter `consumed_units` and tier constants (50/1000/unlimited).
- Do not require separate lifetime credit-grant events.

### Webhooks

- Add `/api/webhooks/polar` route:
  - Verify signatures
  - Extract and forward Standard Webhooks event id as webhook identity
  - Fast ACK after enqueue to Inngest, return non-2xx if enqueue fails so Polar retries
  - Dispatch one internal event (`billing.webhook.received`) and process side effects in an Inngest worker
  - Handle `customer.state_changed`, `subscription.*`, and `order.paid` centrally
  - Keep processing replay-safe with Inngest idempotency keyed by webhook id
  - Emit `plan_upgraded` only for real paid-plan transitions (exclude `subscription_cycle` renewals)

### Local Persistence

- Do not mirror subscription state in local DB.
- For MVP reliability, use Inngest retry + reconciliation before adding operational idempotency tables.
- Add DB-backed outbox/audit tables later only if stricter audit/compliance guarantees are required.

### UI Wiring

- Wire upgrade CTAs in pricing/chat UI to checkout routes.
- Add a manage billing action that opens customer portal.
- Standardize all customer-facing pricing copy to USD.
- Ensure free plan copy reflects Polar-backed limits (chat + video monthly + lifetime).

### Currency Standardization (USD)

- Use USD as canonical billing and reporting currency across app and docs.
- Update pricing copy in app UI (including landing pricing) from `EUR`/`€` to `USD`/`$`.
- Keep internal AI cost calculations in USD to avoid conversion complexity.

### Observability

- Track relevant billing lifecycle events in PostHog (`upgrade_clicked`, `plan_upgraded`, and top-up purchase event if added).
- Log Polar API failures to Sentry with technical context.
- Keep user-facing errors clean and provider-agnostic.

### Tests

- Unit tests for entitlement checks, insufficient-credits path, and idempotency.
- Integration tests for webhook verification/processing and auth-protected checkout/portal routes.

## Acceptance Criteria

- Every app user has a Polar customer and an active free or paid Polar subscription.
- Chat requests are blocked before model invocation when Polar balance is insufficient.
- Source/video ingestion is blocked when monthly or lifetime limits are exhausted.
- Successful chat usage is ingested into Polar exactly once (idempotent retries).
- Successful video ingestion updates Polar usage exactly once (idempotent retries).
- If dispatch to Inngest fails, scheduled reconciliation replays missing usage safely.
- Tier upgrades and top-ups are purchasable via in-app checkout flow.
- Customer portal access is available from the app.
- No local subscription-state mirror exists, aside from optional operational idempotency logs.
- Webhook signature verification and replay-safe handling are implemented.
- Existing `$ai_generation` analytics remain intact.
- User-facing errors remain provider-agnostic.

## Execution Checklist (DOER)

- [ ] Add Polar env schema and validation in `src/server/core/env.ts`
- [ ] Implement Polar client and customer helpers in `src/server/billing/polar/`
- [ ] Implement free user provisioning (`Distillr Free` subscription)
- [ ] Implement checkout and customer portal routes
- [ ] Replace `src/server/billing/credits.ts` stub with Polar state enforcement
- [ ] Enforce monthly and lifetime video limits in ingestion flow
- [ ] Emit chat/video usage events to Inngest workers with deterministic idempotency keys
- [ ] Add scheduled usage reconciliation worker (chat + video)
- [ ] Add webhook route with signature verification and idempotent processing
- [ ] Wire UI CTAs to billing endpoints
- [ ] Add/update PostHog and Sentry instrumentation
- [ ] Add unit and integration tests
- [ ] Update affected docs
