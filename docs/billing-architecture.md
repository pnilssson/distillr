# Billing Architecture

## Purpose

Distillr uses a Polar-first billing model. Polar is the source of truth for subscriptions, entitlements, meter balances, and billing events.

## Scope

- Plans: Free, Builder, Pro.
- One-time top-up: `top_up_500`.
- Usage dimensions:
  - chat credits consumed
  - videos ingested monthly
  - videos ingested lifetime
- Runtime model: app enforces limits from Polar state, then ingests usage asynchronously.

## Billing Model

Plan limits:

| Plan | Monthly chat credits | Monthly videos | Lifetime videos |
| --- | --- | --- | --- |
| Free | 100 | 10 | 50 |
| Builder | 900 | 100 | 1000 |
| Pro | 2500 | 300 | Unlimited |

Top-up:

- `top_up_500` adds 500 chat credits for $9.
- Top-ups are available only to paid plans (`builder`, `pro`).

## Customer State and Provisioning

- Identity bridge: `external_customer_id = app user id`.
- `ensurePolarCustomerState()` lazily ensures customer + free subscription baseline.
- Snapshot builder resolves:
  - effective plan
  - chat balance
  - monthly video balance
  - lifetime consumed/remaining
  - top-up eligibility

## Enforcement Points

- Chat preflight: `checkAndDeductCredits()` blocks when `chatCreditsBalance < 1`.
- Snapshot normalization clamps negative balances to `0` before app enforcement.
- Source planning: ingestion queue is clipped by monthly and lifetime remaining allowances.
- Overflow videos are marked failed with provider-agnostic limit reasons.

## Checkout and Portal Flows

- Routes:
  - `POST /api/billing/checkout`
  - `POST /api/billing/portal`
  - `GET /api/billing/state`
- URL rule: do not hard-code app domains. Build redirect URLs from `NEXT_PUBLIC_APP_URL`.
- Checkout return pattern includes `?billing=success` and triggers client billing-state invalidation.

## Usage Ingestion Reliability

- Hot paths emit internal events only:
  - `billing.usage.chat.record`
  - `billing.usage.video.record`
- Inngest workers call Polar `events.ingest` with deterministic external IDs:
  - chat: `distillr-chat-{assistant_message_id}`
  - video: `distillr-video-{video_id}`
- Retry behavior:
  - workers retry transient failures
  - terminal failures emit `billing_usage_terminal_failed`
- Reconciliation:
  - scheduled job replays recent chat/video usage
  - deterministic pagination by timestamp + id cursor
  - derives `totalTokens` from input/output tokens when missing

## Webhook Architecture

- Endpoint: `POST /api/webhooks/polar`.
- Route responsibilities:
  - verify webhook signature
  - extract stable webhook identity
  - enqueue `billing.webhook.received`
  - return fast `202` on success
  - return non-2xx when enqueue fails so provider retries
- Worker responsibilities (`billing-webhook-received`):
  - idempotent processing by webhook ID
  - handle `customer.state_changed`, `subscription.*`, `order.paid`
  - emit `top_up_purchased` for top-up orders
  - emit `plan_upgraded` only for real upgrade reasons (`purchase`, `subscription_create`, `subscription_update`), not renewal cycles

## Analytics Events

Core billing funnel events:

- `upgrade_prompt_shown`
- `upgrade_clicked`
- `top_up_clicked`
- `billing_portal_opened`
- `top_up_purchased`
- `plan_upgraded`
- `billing_usage_terminal_failed`

All properties should remain snake_case and provider-agnostic.

## Key Entry Points

- `src/server/billing/credits.ts`
- `src/server/billing/polar/*`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/app/api/billing/state/route.ts`
- `src/app/api/webhooks/polar/route.ts`
- `src/server/inngest/functions/billing-usage.ts`
- `src/server/inngest/functions/billing-webhooks.ts`

## Safe Change Checklist

When changing billing behavior:

1. Keep Polar as source of truth (no local entitlement mirror).
2. Preserve idempotent usage ingestion keys.
3. Preserve webhook route fast-ack + worker-based side effects.
4. Keep renewal-safe `plan_upgraded` semantics.
5. Preserve provider-agnostic customer messaging.
6. Verify `npm run typecheck`, `npm run lint`, and `npm run build`.
7. Update this file when limits, event semantics, or flow ownership changes.
