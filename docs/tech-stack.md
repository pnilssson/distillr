# Tech Stack

All decisions below are locked for MVP. Do not substitute without explicit decision.

---

## Frontend / Framework

**Next.js (App Router)**
Hosted on Vercel.

- Language/runtime: `react`, `react-dom`, `typescript`
- Code quality: `eslint`, `eslint-config-next`
- Type packages: `@types/node`, `@types/react`, `@types/react-dom`

---

## Database

**Supabase Postgres**

- pgvector extension enabled for vector embeddings (RAG layer)
- Row Level Security (RLS) enforced on all tables - users are completely isolated by policy, not just query logic

**ORM / Migrations:** Drizzle

- Installed DB packages: `drizzle-orm`, `drizzle-kit`, `postgres`

---

## Auth

**Supabase Auth** - email + magic link for MVP

- Supabase handles magic link email delivery out of the box for MVP
- Supabase's default email has low deliverability and Supabase branding - acceptable for early users, not for scale
- Resend is post-MVP: custom domain sending, branded templates, transactional emails (ingestion complete, export ready)
- Next.js clients use `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (no legacy anon key usage)
- Installed auth packages: `@supabase/supabase-js`, `@supabase/ssr`

---

## Forms

**React Hook Form + `@hookform/resolvers/zod`**

- Use RHF for all interactive forms (login email, library name, source URL)
- Use `zodResolver()` so client and server share the same Zod schemas
- Prefer shadcn primitives with RHF over bespoke stateful form handling
- Installed form packages: `react-hook-form`, `@hookform/resolvers`, `zod`

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

- Installed styling packages: `tailwindcss`, `@tailwindcss/postcss`
- Installed UI support packages: `shadcn`, `radix-ui`, `next-themes`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `sonner`, `lucide-react`, `geist`

---

## Client State

**Zustand**

- Use for shared client-side state when local component state is no longer enough

---

## Server State / Data Fetching

**@tanstack/react-query**

- Use for all client-side server state: fetching, caching, background refetching, and mutations
- Wrap the app in a `QueryClientProvider`; include `ReactQueryDevtools` in development
- Prefer `useQuery` for reads and `useMutation` for writes over manual `useState` + `fetch` patterns

---

## URL Parameter State

**nuqs**

- Use for all URL search parameter state (filters, pagination, selected IDs, tab state)
- Type-safe, works with Next.js App Router Server and Client Components
- Prefer over manual `useSearchParams` / `router.push` for any stateful URL param

---

## Rate Limiting

**Upstash Redis + @upstash/ratelimit**

---

## Error Logging

**Sentry**

---

## Env Validation

**@t3-oss/env-nextjs**

- Installed support package: `server-only`

---

## Observability

**PostHog** for product analytics, session replay, and LLM cost monitoring.

- Use PostHog's native `$ai_generation` event to track every Claude API call: tokens in, tokens out, latency, cost
- Initialize `posthog-js` with Next.js `instrumentation-client.ts`
- For `posthog-node`, use `flushAt: 1`, `flushInterval: 0`, and always `shutdown()` after server captures
- Free tier: 1M events/month
- Installed analytics packages: `posthog-js`, `posthog-node`

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
