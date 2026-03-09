# Tech Stack

All decisions below are locked for MVP. Do not substitute without explicit decision.

---

## Frontend / Framework

**Next.js (App Router)**
Hosted on Vercel.

---

## Database

**Supabase Postgres**

- pgvector extension enabled for vector embeddings (RAG layer)
- Row Level Security (RLS) enforced on all tables - users are completely isolated by policy, not just query logic

**ORM / Migrations:** Drizzle

---

## Auth

**Supabase Auth** - email + magic link for MVP

- Supabase handles magic link email delivery out of the box for MVP
- Supabase's default email has low deliverability and Supabase branding - acceptable for early users, not for scale
- Resend is post-MVP: custom domain sending, branded templates, transactional emails (ingestion complete, export ready)

---

## Background Jobs

**Inngest**

- All transcript ingestion runs as durable, multi-step Inngest functions
- Automatic retries per step - a failed embedding step does not re-fetch the transcript
- Fan-out pattern: one event per video, processed concurrently with configurable concurrency limits

---

## Payments

**Polar.sh**

- Merchant of Record - handles EU VAT and global tax compliance automatically
- Subscription tiers + usage metering (videos ingested, chat messages sent)
- Webhook-driven entitlement via `onSubscriptionUpdated`

---

## Transcript Extraction

**TranscriptAPI.com** (REST API)

- No Python required - pure REST calls from Next.js route handlers or Inngest functions
- Handles channel listing, playlist expansion, and individual video transcripts
- Whisper fallback for videos without captions is deferred to post-MVP

---

## Embeddings

**OpenAI `text-embedding-3-small`**

- 1536 dimensions, cheap (~$0.02 per 1M tokens), excellent quality
- Cost per typical 1hr video transcript: ~$0.002

---

## LLM (Chat + Summaries)

**Anthropic Claude**

- `claude-haiku-4-5` for bulk summary generation during ingestion (cheap, fast)
- `claude-sonnet-4-6` for interactive chat (better reasoning, worth the cost)

---

## UI

**shadcn/ui + Tailwind CSS**

---

## Client State

**Zustand**

- Use for shared client-side state when local component state is no longer enough

---

## Rate Limiting

**Upstash Redis + @upstash/ratelimit**

---

## Error Logging

**Sentry**

---

## Env Validation

**@t3-oss/env-nextjs**

---

## Observability

**PostHog** for product analytics, session replay, and LLM cost monitoring.

- Use PostHog's native `$ai_generation` event to track every Claude API call: tokens in, tokens out, latency, cost
- Free tier: 1M events/month

**Inngest dashboard** for job observability (retries, failures, timing per function).

**Polar dashboard** for revenue and subscription metrics.

---

## Server-Only Environment Variables

The following keys must never be exposed to the client:

- Anthropic API key
- OpenAI API key
- TranscriptAPI key
- Polar secret
- Inngest signing key
