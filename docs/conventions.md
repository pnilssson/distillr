# Conventions

## Why This Matters More With AI

AI generates working code optimized for the current prompt, not for your future self debugging at midnight. Left unchecked it produces 400-600 line components that mix data fetching, business logic, UI rendering, and local state in one file. This creates two concrete problems:

- **AI works worse on large files.** When you paste a 400-line component and ask for a change, the model has to hold all of it in context, reason about side effects, and output the whole thing again. A 60-line component gets fast, surgical edits.
- **You debug this yourself eventually.** Session replay shows a weird bug. If the relevant code is buried in a 500-line file you are scrolling forever. Good splits mean you open the right file immediately.

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

**Data fetching never lives in client components.** Server components fetch data. Client components receive it as props or read it from a hook. AI will try to collapse this. Push back every time.

**Extract named feature components** when a chunk of JSX can be meaningfully described with a noun: `VideoCard`, `IngestionStatusBanner`, `LibrarySidebar`, `ChatMessage`. Feature components can reasonably be 100-200 lines.

**Extract custom hooks** when a component has more than 2-3 `useState` calls, polling logic, or complex state transitions. Examples: `useLibraryIngestion()`, `useChat()`, `usePlanLimits()`. The component stays clean. The hook can be reasoned about in isolation.

**Do not extract** one-off wrappers that will never be reused, or when splitting would require threading 6+ props down to reach the actual consumer. Prop drilling is worse than a slightly large file.

---

## Prompt Instruction for AI

Include this in prompts when building new features:

> "Keep page components under 80 lines. Extract named feature components into `/features/[domain]/`. Extract stateful logic into custom hooks. Do not put data fetching inside client components."

---

## Route Structure

```
/                          Landing page
/sign-in                   Auth
/sign-up                   Auth
/dashboard                 Library list
/libraries/new             Create library
/libraries/:id             Library home (video list + status)
/libraries/:id/chat        Chat interface
/libraries/:id/settings    Library settings + danger zone
/account                   Account + billing (Polar portal link)
```

---

## Security Model

- All writes go through Next.js Route Handlers - no direct client-to-database writes
- Supabase RLS is the enforcement layer, not just application-level filtering
- `user_id` on every sensitive table - denormalized intentionally
- Rate limiting on: source addition, chat messages, export endpoints
- Polar webhook signature verification on `/api/billing/webhook`
- Zod schema validation on every mutation payload
- Server-only env vars: Anthropic key, OpenAI key, TranscriptAPI key, Polar secret, Inngest signing key

---

## Observability Events

Custom PostHog events to instrument:

- `library_created`
- `source_added`
- `video_ready`
- `video_failed`
- `chat_message_sent` (token count as property)
- `export_triggered`
- `upgrade_prompt_shown`
- `upgrade_clicked`
- `plan_upgraded`

Use PostHog's native `$ai_generation` event for every Claude API call: tokens in, tokens out, latency, cost.

Log ingestion failures with reason per video - surfaced in UI, not hidden.

---

## Build Order (MVP Slices)

1. Auth + shell - Supabase Auth, dashboard skeleton, route structure, mobile + desktop layout
2. Libraries CRUD - create, list, delete libraries; basic UI
3. Source ingestion - add URL, Inngest pipeline, transcript + embed, status UI
4. Video browser - list videos in a library, per-video summary + insights display
5. Library chat - RAG query, streaming response, citations, chat history
6. Export - summary pack, raw transcript, chat export
7. Billing - Polar integration, plan limits enforcement, upgrade prompts
8. Polish + launch - landing page, onboarding flow, error states, empty states

---

## Onboarding Flow

No modals. No carousels. No "how it works" slides. The onboarding is the product flow itself.

After signup, the user sees:

- Empty dashboard with a single prominent CTA: "Create your first library"
- 2-3 example chips below it suggesting use cases: "Research a YouTube channel", "Follow a creator", "Mine a playlist"
- No other UI until they take that action

Library creation is instant - just a name. Then the user is immediately inside the library and prompted to add their first source URL.

First source added: the ingestion pipeline starts, a progress indicator appears per video (pending / processing / ready). First video ready triggers a toast: "First video ready - start chatting."
