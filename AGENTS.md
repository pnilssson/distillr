# AGENTS

This file is the source of truth for agent behavior in this repository.

## Project Context

- Framework: Next.js App Router (hosted on Vercel)
- Database: Supabase Postgres with Drizzle ORM/migrations
- Jobs: Inngest
- UI: shadcn/ui + Tailwind CSS

## Source Of Truth Docs

- `docs/product.md` - product scope, pricing, and target users
- `docs/tech-stack.md` - locked stack choices
- `docs/data-architecture.md` - schema, tenancy, and RLS model
- `docs/conventions.md` - repo structure and engineering conventions
- `docs/design-system.md` - colors, typography, layout, and component principles
- `docs/ingestion-pipeline.md` - Inngest flow, chunking strategy, and failure handling
- `docs/rag-chat.md` - RAG query flow, citation format, and chat persistence
- `docs/tasks.md` - current and upcoming work items
- `docs/log.md` - changelog of significant decisions and changes

## Next.js Execution Rules

- Default to Server Components. Add `'use client'` only when needed for interactivity, browser APIs, or client state.
- Do not access browser-only APIs during SSR (`window`, `document`, `localStorage`, `navigator`, `matchMedia`). Use guarded client-only logic in `useEffect` or isolate with dynamic import.
- Prevent hydration mismatches. Do not render non-deterministic values in server output (`Date`, random values, browser-derived values) without a stable initial render.
- Keep data fetching on the server whenever possible (Server Components, Route Handlers, server-side utilities).
- Use dynamic imports with `ssr: false` for truly client-only modules.
- Add explicit loading and error states for async route-level UX (`loading.tsx`, `error.tsx`) or equivalent component-level fallbacks.
- Prefer Next.js primitives (`next/link`, `next/image`, metadata APIs) when applicable.

## Component Architecture Rules

- Extract named feature components when a chunk of JSX can be meaningfully described with a noun: `VideoCard`, `IngestionStatusBanner`, `LibrarySidebar`, `ChatMessage`. Feature components can reasonably be 100-200 lines.
- Extract custom hooks when a component has more than 2-3 `useState` calls, polling logic, or complex state transitions. Examples: `useLibraryIngestion()`, `useChat()`, `usePlanLimits()`.
- Keep page components under 80 lines. Files in `/app/**/page.tsx` compose sections and pass data down only.
- Do not extract one-off wrappers that will never be reused, or when splitting would require threading 6+ props to the actual consumer.

## Repo-Specific Invariants

- Never hand-write migrations. Define schema and policy changes in Drizzle and generate migrations from Drizzle.
- Define RLS policies in Drizzle schema (`src/db/schema.ts` pattern) and generate SQL via Drizzle migrations.
- All writes must go through server-side boundaries (Route Handlers / server code), never direct client-to-database writes.
- Keep sensitive keys server-only.
- Never directly modify files in `src/components/ui/`.
- If a UI primitive in `src/components/ui/` needs to be added, updated, or replaced, use the shadcn CLI and official docs (`https://ui.shadcn.com/docs/installation/next`) to regenerate it.

## Documentation Hygiene

- Keep `docs/` human-facing (product, architecture, process).
- Keep AI/LLM prompt instructions centralized in `AGENTS.md`, not scattered across `docs/`.
- After making a significant change (new feature, architecture decision, schema change, config change), append a dated entry to `docs/log.md` using format `## YYYY-MM-DD` with a short bullet summary of what changed and why.

## Commits

- Use conventional commit messages: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`.
- Keep the subject line under 72 characters.
- No em dashes in commit messages.

## Observability

- Use PostHog's native `$ai_generation` event for every Claude API call: tokens in, tokens out, latency, cost.
- Track these custom PostHog events: `library_created`, `source_added`, `video_ready`, `video_failed`, `chat_message_sent` (token count as property), `export_triggered`, `upgrade_prompt_shown`, `upgrade_clicked`, `plan_upgraded`.
- Log ingestion failures with reason per video - surfaced in UI, not hidden.

## Accessibility

- Target WCAG 2.1 AA. Don't over-engineer it, but follow the basics.
- Every `<input>` needs an associated `<label>` (visible or `sr-only`). Placeholder alone is not a label.
- Link field error messages to their input with `aria-describedby`.
- Icon-only buttons need `aria-label`.
- Use semantic landmarks (`<nav>`, `<main>`, `<section>`, `<header>`).
- Radix UI (via shadcn) handles ARIA for dialogs, dropdowns, etc. - use those primitives rather than rolling custom implementations.

---

## Writing Rule

- Do not use em dashes in generated copy. Use hyphens or rewrite.
