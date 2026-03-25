# Billing Architecture

## Purpose

Distillr uses a Polar-first billing model. Polar is the source of truth for subscriptions, entitlements, meter balances, and billing events.

## Scope

- Plans: Free, Builder, Pro.
- One-time top-up: `top_up_tier_1`.
- Usage dimensions:
  - chat credits consumed
  - videos ingested monthly
  - videos ingested lifetime
- Runtime model: app enforces limits from Polar state, then ingests usage asynchronously.

## Billing Model

Plan limits:

| Plan | Monthly chat credits | Monthly videos | Lifetime videos |
| --- | --- | --- | --- |
| Free | 25 | 15 | 100 |
| Builder | 250 | 150 | 1000 |
| Pro | 750 | 450 | Unlimited |

Export format entitlements:

| Plan | Allowed export formats |
| --- | --- |
| Free | txt |
| Builder | txt, md, pdf |
| Pro | txt, md, pdf |

Top-up:

- `top_up_tier_1` adds 100 chat credits for $3.
- Top-ups are available only to paid plans (`builder`, `pro`).

## Customer State and Provisioning

- Identity bridge: `external_customer_id = app user id`.
- Provisioning runs on auth callback and selected write paths, not on passive read paths.
- Provisioning checks existing subscriptions via Polar subscriptions API before creating a free baseline subscription.
- Billing state reads are non-mutating and use Polar customer state snapshots.
- Polar API requests are authenticated with organization access tokens and should not send `organization_id` in payloads.
- Snapshot builder resolves:
  - effective plan
  - chat balance
  - monthly video balance
  - lifetime consumed/remaining
  - top-up eligibility
  - allowed export formats

## Enforcement Points

- Chat preflight: `checkAndDeductCredits()` blocks when `chatCreditsBalance < 1`.
- Smart export preflight: `checkAndDeductCredits()` blocks when `chatCreditsBalance < 3`.
- Smart export usage: successful smart exports ingest a fixed 3-credit usage event.
- Snapshot normalization clamps negative balances to `0` before app enforcement.
- Source planning: ingestion queue is clipped by monthly and lifetime remaining allowances.
- Overflow videos are marked failed with provider-agnostic limit reasons.
- Export routes enforce plan-gated export formats server-side.

## Checkout and Portal Flows

- Routes:
  - `POST /api/billing/checkout`
  - `POST /api/billing/portal`
  - `GET /api/billing/state`
- URL rule: do not hard-code app domains. Build redirect URLs from `NEXT_PUBLIC_APP_URL`.
- Checkout return pattern includes `?billing=success` and triggers client billing-state invalidation.

## Plan Upgrade and Downgrade Flow

- Free-to-paid: checkout passes the Free subscription's `subscription_id` so Polar replaces it in place. This supports discount codes.
- Paid-to-paid (e.g. Builder to Pro): checkout creates a new subscription; the webhook handler revokes lower-tier subscriptions after detecting a `plan_upgraded` event.
- Subscription expiry: on `subscription.revoked` webhook, if the user has no remaining active Distillr subscriptions, a Free subscription is automatically re-provisioned.
- The free-priced check uses `isFreePrice()` (derived from `monthlyPriceUsd === 0`) to stay plan-name-agnostic.
- Polar "allow multiple subscriptions" must remain enabled for the paid-to-paid checkout path to work.

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
  - revoke lower-tier subscriptions after a plan upgrade
  - re-provision Free subscription on `subscription.revoked` when no active subscriptions remain

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
- `src/app/api/libraries/[libraryId]/chat/sessions/[sessionId]/export/route.ts`
- `src/app/api/libraries/[libraryId]/content-items/[contentItemId]/export/route.ts`
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
