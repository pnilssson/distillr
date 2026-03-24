# AGENTS

This file is the operational source of truth for agent behavior in this repository.

## Product and Docs Scope

- `docs/` is for agents.
- Canonical domain is `distillr.co`. Do not use alternate domains in docs, links, examples, or product copy.
- Never hard-code app URLs in code paths. Use `NEXT_PUBLIC_APP_URL` (or a centralized helper derived from it) for redirects, callback links, and metadata base URLs.
- Keep docs lean: product overview plus feature architecture docs for ingestion, chat, and billing.
- When pricing, credit limits, or top-up economics change, update `docs/product.md`, `docs/billing-architecture.md`, and `src/features/marketing/PricingSection.tsx` in the same PR.
- When behavior or decisions change, update this file and any impacted feature doc in the same PR.
- Remove outdated guidance instead of keeping historical notes.

## Code Design Principles

- Build abstractions proactively when a concern spans multiple files or is likely to change independently (e.g. AI providers, billing, auth). A thin interface today prevents scattered rewrites later.
- Prefer scalable, future-proof designs over the shortest path. If adding a second instance of something (model, provider, plan tier) would require touching more than one file, the design is not scalable enough — fix the abstraction first.
- Follow DRY: if the same logic, value, or type appears in more than one place, extract it to a single source of truth. Duplication is a bug waiting to happen.
- These principles complement, not override, YAGNI. Build the abstraction when the pattern is clear and established; do not build it speculatively for features that do not exist yet.

## MVP Code Hygiene

- Prefer forward-only implementation. Do not add backward-compatibility shims, dual-write paths, or legacy fallbacks.
- Keep the codebase clean and current for MVP. Remove obsolete paths instead of carrying both old and new behavior.
- If a forward-only change requires manual data cleanup or operational action, tell the user exactly what to do before implementing follow-up logic.

## Project Context

- Framework: Next.js App Router on Vercel
- Database: Supabase Postgres with Drizzle ORM and generated migrations
- Jobs: Inngest
- UI: shadcn/ui with Tailwind CSS
- Analytics and errors: PostHog and Sentry

## Locked Stack Choices

- Auth: Supabase Auth (magic link)
- Forms and validation: React Hook Form + Zod
- Client server-state: TanStack Query
- Billing: Polar
- Streaming: Vercel AI SDK v6 (`ai`, `@ai-sdk/react`)
- AI provider SDK: Vercel AI SDK with `@ai-sdk/openai` (extensible; add providers via `src/server/core/ai/providers.ts`)
- Transcript extraction: TranscriptAPI
- Embeddings: OpenAI `text-embedding-3-small` (alias `embedding.default`)
- LLMs (MVP): OpenAI only - `gpt-5.4-nano` (Nano/fast), `gpt-5.4-mini` (Mini/default), `gpt-5.4` (Smart/pro) via alias-based config in `src/server/core/ai/models.ts`

## Next.js Best Practices

- Default to Server Components. Add `'use client'` only for interactivity, client state, lifecycle hooks, or browser APIs.
- Keep data fetching on the server when possible. Pass serialized data to Client Components.
- Keep secrets and sensitive logic server-only.
- Do not use browser-only APIs during SSR (`window`, `document`, `localStorage`, `navigator`, `matchMedia`).
- Prevent hydration mismatches. Avoid non-deterministic values in server output.
- Use route-level loading and error states (`loading.tsx`, `error.tsx`, `global-error.tsx`) for async UX and uncaught exceptions.
- Use explicit caching and revalidation behavior for server fetches.
- Prefer parallel fetching (`Promise.all`) for independent requests.
- Use dynamic import with `ssr: false` only for truly client-only modules.
- Prefer Next.js primitives (`next/link`, `next/image`, Metadata API) when applicable.

## Architecture Rules

- Keep page files in `/app/**/page.tsx` thin and compositional.
- Extract named feature components when JSX blocks represent clear domain concepts.
- Extract custom hooks for complex client state transitions, polling, or mutation flows.
- Avoid extra wrappers that add indirection without reuse value.

## Data and Security Invariants

- Never hand-write migrations. Define schema and policy changes in Drizzle and generate migrations.
- Define RLS policies in Drizzle schema and generate SQL through migrations.
- All writes go through server boundaries (Route Handlers or server code), never direct client-to-database writes.
- Preserve tenant isolation with `user_id` and RLS across sensitive tables.
- Keep sensitive keys server-only.
- Model source ownership as many-to-many (`sources` ↔ `content_items`) so overlapping playlist/channel sources in one library cannot overwrite ownership.

## Source Sync Invariants

- Source auto-sync is opt-in and disabled by default.
- Auto-sync applies only to channel and playlist sources.
- If ingestion allowance is exhausted, newly discovered items remain deferred for later cycles instead of being marked terminal failed.

## Retrieval Invariants

- Use hybrid retrieval by default: vector similarity + full-text search.
- Retrieve from two layers: `content_chunks` and `content_insights`.
- Scope retrieval to one library and only `content_items.status = 'ready'`.
- Include a compact source rollup with item-level citations and optional typed anchors in chat answers.
- If retrieval evidence is weak, respond with uncertainty instead of guessing.

## UI and Accessibility Invariants

- Never directly modify files in `src/components/ui/`.
- Preserve a single-product feel across authenticated surfaces (`/dashboard`, `/library/**`, chat, billing). New screens should feel like extensions of the same app, not separate products.
- Keep core layout rhythm consistent across app pages: shared content widths, comparable header-to-content spacing, and aligned section spacing unless there is a clear product reason to diverge.
- Reuse established UI patterns for equivalent information (for example metric cards, list headers, and row/list containers) before introducing new visual patterns.
- If a visual divergence is intentional, document the reason in the same PR and keep interaction patterns consistent (focus states, hover behavior, empty states, and action placement).
- Target WCAG 2.1 AA baseline.
- Every input must have an associated label.
- Link field errors with `aria-describedby`.
- Icon-only buttons require `aria-label`.
- Use semantic landmarks (`nav`, `main`, `section`, `header`).

## User Messaging Invariants

- User-facing error messages must be provider-agnostic. Do not mention internal vendors or stack choices.
- Include technical failure details only in logs and Sentry context.

## Observability

- Track every OpenAI API call with PostHog `$ai_generation` (tokens in, tokens out, latency, cost).
- Track: `library_created`, `source_added`, `video_ready`, `video_failed`, `chat_message_sent`, `export_triggered`, `upgrade_prompt_shown`, `upgrade_clicked`, `plan_upgraded`.
- Surface ingestion failures in the UI with clear, provider-agnostic reason per video.

## Commits and Writing

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`.
- Keep commit subject lines under 72 characters.
- Do not use em dashes in generated copy. Use hyphens or rewrite.
