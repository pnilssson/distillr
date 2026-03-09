# Conventions

- **Large files are harder to maintain.** When a component mixes data fetching, business logic, rendering, and local state, edits become slower and riskier. Smaller focused files make changes more predictable.

The goal is not small files for the sake of it. It is separating things that change for different reasons.

---

## File Structure

```
src/
  app/                   - Next.js App Router pages (thin shells only)
  features/              - Feature modules, one folder per domain
    libraries/
      LibraryList.tsx
      LibraryCard.tsx
      useLibraries.ts
    videos/
      VideoGrid.tsx
      VideoCard.tsx
      IngestionStatusBanner.tsx
    chat/
      ChatPanel.tsx
      ChatMessage.tsx
      useChat.ts
  components/
    ui/                  - shadcn primitives, never touch these
  hooks/                 - Shared custom hooks
  lib/                   - Shared utilities, no UI
  server/
    core/         - auth helpers, cookies, rate limits, env, HTTP utils
    libraries/    - library domain: repository, auth guards, ingestion triggers
    videos/       - video domain: status, summary cache, chunk management
    chat/         - RAG query, context assembly, message persistence
    billing/      - Polar webhook handler, plan resolution, limit enforcement
  inngest/
    functions/
      ingest-source.ts
      ingest-video.ts
```

---

## Hard Rules

**Page components stay thin.** Files in `/app/**/page.tsx` compose sections and pass data down. They should rarely exceed 80 lines. If a page component is growing, something that belongs in a feature component is leaking upward.

**Data fetching never lives in client components.** Server components fetch data. Client components receive it as props or read it from a hook.

**Forms use React Hook Form with Zod resolvers.** Use `react-hook-form` + `@hookform/resolvers/zod` for all product forms, with shared Zod schemas between client and Route Handlers.

**Migrations are generated, never hand-written.** Do not create migration files manually. Define schema and policy changes in Drizzle, then generate migrations from Drizzle.

**Extract named feature components** when a chunk of JSX can be meaningfully described with a noun: `VideoCard`, `IngestionStatusBanner`, `LibrarySidebar`, `ChatMessage`. Feature components can reasonably be 100-200 lines.

**Extract custom hooks** when a component has more than 2-3 `useState` calls, polling logic, or complex state transitions. Examples: `useLibraryIngestion()`, `useChat()`, `usePlanLimits()`. The component stays clean. The hook can be reasoned about in isolation.

**Do not extract** one-off wrappers that will never be reused, or when splitting would require threading 6+ props down to reach the actual consumer. Prop drilling is worse than a slightly large file.

## Security Model

- All writes go through Next.js Route Handlers - no direct client-to-database writes
- Supabase RLS is the enforcement layer, not just application-level filtering
- Supabase app clients use the publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), not legacy anon/service role keys
- `user_id` on every sensitive table - denormalized intentionally
- Rate limiting on: source addition, chat messages, export endpoints
- Polar webhook signature verification on `/api/billing/webhook`
- Zod schema validation on every mutation payload
- Server-only env vars: Anthropic key, OpenAI key, TranscriptAPI key, Polar secret, Inngest signing key

---

## Onboarding Flow

No modals. No carousels. No "how it works" slides. The onboarding is the product flow itself.

After signup, the user sees:

- Empty dashboard with a single prominent CTA: "Create your first library"
- 2-3 example chips below it suggesting use cases: "Research a YouTube channel", "Follow a creator", "Distill a playlist"
- No other UI until they take that action

Library creation is instant - just a name. Then the user is immediately inside the library and prompted to add their first source URL.

First source added: the ingestion pipeline starts, a progress indicator appears per video (pending / processing / ready). First video ready triggers a toast: "First video ready - start chatting."
