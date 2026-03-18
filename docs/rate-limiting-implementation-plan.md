# Rate Limiting Implementation Plan

## Context

Distillr now has Polar-based billing and meter enforcement for chat credits and video ingestion quotas.

Existing protections already cover the main monthly spend boundaries:

- Chat requests are blocked when credits are insufficient.
- Source ingestion admission is limited by monthly and lifetime video balances.
- Video ingestion work is already constrained by Inngest concurrency.

Because of this, rate limiting should focus on burst abuse protection and infrastructure stability, not replacing quota logic.

## Decisions

1. Keep Polar meters as the source of truth for chat and ingestion quotas.
2. Add Upstash rate limiting for chat message velocity only.
3. Do not add weighted source-add request limits.
4. Add Inngest throttle to smooth video ingestion start rate per user.
5. Provide clear UX for rate limit hits with retry timing and reason.

## Why no weighted source limits

Plan caps are already defined in `docs/product.md` and enforced by discovered video counts during ingestion.

- Free: 15 indexed videos per month
- Builder: 150 indexed videos per month
- Pro: 500 indexed videos per month

Since we already compute exactly how many videos will be queued and clamp by remaining allowance, weighting source requests by type (video, playlist, channel) adds friction without better cost control.

## Implementation Scope

### 1) Central rate limit module (Upstash)

Create a reusable server module:

- `src/server/core/rate-limit/client.ts`
- `src/server/core/rate-limit/policies.ts`
- `src/server/core/rate-limit/enforce.ts`

Responsibilities:

- Initialize Upstash Redis and `@upstash/ratelimit` clients.
- Define policy keys and policy config in one place.
- Expose a typed `enforceRateLimit` helper used by routes.
- Return normalized metadata (`success`, `retryAfterSec`, `limit`, `remaining`, `reset`).

Environment variables:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Add these to:

- `.env.example`
- `src/server/core/env.ts`

### 2) Chat message velocity limit

Apply in:

- `src/app/api/libraries/[libraryId]/chat/sessions/[sessionId]/messages/route.ts` (`POST`)

Key:

- `user.id`

Initial policy:

- 20 requests per minute
- 300 requests per hour

Behavior on limit hit:

- Return HTTP `429`.
- Include `Retry-After` header.
- Return a structured provider-agnostic JSON error payload.

### 3) Ingestion pacing in Inngest

Update:

- `src/server/inngest/functions/video-ingest.ts`

Keep current:

- `concurrency: { limit: 5, key: "event.data.userId" }`

Add:

- `throttle` keyed by `event.data.userId` to smooth starts over time.

Initial throttle suggestion:

- `limit: 60`
- `period: "1h"`
- Optional small `burst` if needed for queue catch-up.

This protects downstream AI/transcript workloads from burst spikes while preserving monthly cap behavior.

### 4) Source add behavior

Do not add a separate Upstash limiter for `POST /sources` in this phase.

Keep relying on:

- Ingestion allowance enforcement in `source-added`.
- Overflow handling that marks over-cap videos as failed with clear reasons.

## Rate limit response contract

For all app-level rate limited endpoints, return:

- `status: 429`
- Headers:
  - `Retry-After`
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
- JSON body:
  - `error` (human-readable)
  - `code: "RATE_LIMITED"`
  - `action` (for example `chat.message`)
  - `retryAfterSec`
  - `resetAt`

Example message:

- `"Too many requests. Please wait and try again."`

## UX plan for rate limit hits

### Chat input UX

Files:

- `src/features/chat/ChatView.tsx`
- `src/features/chat/ChatInput.tsx`

Behavior:

- Parse structured 429 payload and headers.
- Show explicit reason and countdown, for example: `"You are sending messages too quickly. Try again in 42s."`
- Keep current text input unchanged.
- Disable send while cooldown is active.
- Keep retry action visible.
- Do not show upgrade or top-up CTA for rate limit errors (only for insufficient credits).

### Ingestion cap UX

No new source request limiter UX is needed.

Instead, ensure existing failure reasons remain clear and plan-oriented in video details and status surfaces.

## Observability

Track rate limit events for tuning:

- PostHog event: `rate_limit_hit`
  - `action`, `retry_after_sec`, `limit`, `remaining`, `user_id`
- Sentry capture for limiter operational errors
  - tag with `area: "rate_limit"`

Operational mode:

- If Upstash check fails, fail open for MVP and log the incident.

## Acceptance criteria

- Chat message endpoint enforces Upstash velocity limits and returns consistent 429 responses.
- Chat UI clearly communicates limit reason and retry timing.
- Chat send action is disabled during cooldown.
- Video ingest function has both per-user concurrency and throttle.
- No weighted source request limiter is introduced.
- Existing Polar monthly and lifetime ingestion caps remain the only ingestion quota authority.

## Rollout and tuning

1. Ship with conservative defaults (20/min, 300/hour for chat).
2. Monitor `rate_limit_hit` frequency and user feedback.
3. Adjust thresholds by real usage patterns.
4. If abuse appears on source endpoint despite cap enforcement, add a very high coarse request guard later (not weighted), with product review first.
