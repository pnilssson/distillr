# AGENTS

This file is the operational source of truth for agent behavior in this repository.

## Product and Docs Scope

- `docs/` is for agents.
- Keep docs lean: product overview and feature-specific implementation plans.
- When behavior or decisions change, update this file and any impacted feature doc in the same PR.
- Remove outdated guidance instead of keeping historical notes.

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
- Transcript extraction: TranscriptAPI
- Embeddings: OpenAI `text-embedding-3-small`
- LLMs (MVP): OpenAI only - `gpt-4.1-mini` for ingestion summaries, `gpt-4.1` for chat

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

## Retrieval Invariants

- Use hybrid retrieval by default: vector similarity + full-text search.
- Retrieve from two layers: `video_chunks` and `video_insights`.
- Scope retrieval to one library and only `videos.status = 'ready'`.
- Include a compact source rollup with video title + timestamps in chat answers.
- If retrieval evidence is weak, respond with uncertainty instead of guessing.

## UI and Accessibility Invariants

- Never directly modify files in `src/components/ui/`.
- Target WCAG 2.1 AA baseline.
- Every input must have an associated label.
- Link field errors with `aria-describedby`.
- Icon-only buttons require `aria-label`.
- Use semantic landmarks (`nav`, `main`, `section`, `header`).

## Observability

- Track every OpenAI API call with PostHog `$ai_generation` (tokens in, tokens out, latency, cost).
- Track: `library_created`, `source_added`, `video_ready`, `video_failed`, `chat_message_sent`, `export_triggered`, `upgrade_prompt_shown`, `upgrade_clicked`, `plan_upgraded`.
- Surface ingestion failures in the UI with clear reason per video.

## Commits and Writing

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`.
- Keep commit subject lines under 72 characters.
- Do not use em dashes in generated copy. Use hyphens or rewrite.
