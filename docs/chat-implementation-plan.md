# Chat Backend Implementation Plan

This document is the step-by-step plan for implementing library chat in Distillr.

Goal: ship a backend-complete chat system so UI work is mostly wiring.

Scope: backend only in this plan. UI implementation is intentionally deferred.

## Non-negotiable constraints

- Follow `AGENTS.md` invariants (security, retrieval, messaging, observability, docs updates).
- Do not hand-write SQL migrations. Change Drizzle schema and generate migrations.
- Keep all writes server-side only via route handlers/server code.
- Chat is scoped to one library, and only `videos.status = 'ready'` are eligible for retrieval.
- Stream assistant output using Vercel AI SDK, as documented in `docs/rag-chat.md`.

## Final architecture summary

- Storage: `chat_sessions` + `chat_messages` with RLS and denormalized ownership fields.
- Retrieval: hybrid search over `video_chunks` and `video_insights` plus chunk FTS.
- Ranking: deterministic weighted fusion with explicit score normalization.
- Generation: OpenAI alias-based chat model (`chat.fast` / `chat.smart`), streamed via Vercel AI SDK.
- Persistence: user message persisted before generation; assistant persisted on stream finish.
- Sources: compact rollup (top 3-5 videos with grouped timestamps) returned for UI.
- Analytics: `$ai_generation` on all OpenAI calls and `chat_message_sent` on success.

## Phase 0 - Lock contracts and docs before code

1. Update docs and lock backend transport/behavior contracts.
2. Do not start backend implementation until this phase is complete.

### Files to update

- `AGENTS.md`
  - Add Vercel AI SDK streaming under locked stack choices.
- `docs/rag-chat.md`
  - Explicitly define stream transport and persistence on finish.
  - Define aborted stream behavior.
- `docs/retrieval-architecture.md`
  - Add explicit normalization and weighted fusion formula.

### Completion check

- Contracts in this file and in docs agree on streaming and persistence behavior.

## Phase 1 - Shared OpenAI refactor (first code task)

Refactor shared OpenAI client and embedding utility before writing chat modules.

### Tasks

1. Create `src/server/core/openai/client.ts`
   - Shared OpenAI singleton factory.
   - Shared model constants.
2. Create `src/server/core/openai/embeddings.ts`
   - Move `embedTexts` here with existing `$ai_generation` tracking.
3. Update ingestion imports:
   - `src/server/ingestion/openai.ts` should import shared OpenAI/embedding helpers.
4. Keep behavior unchanged for ingestion.

### Completion check

- `video.ingest` still compiles and uses shared embedding utility.
- No duplicated `embedTexts` implementation remains.

## Phase 2 - Data model and migration

Add persistent chat schema with RLS, indexes, and JSONB evidence fields.

### Schema additions (`src/db/schema.ts`)

1. `chat_sessions`
   - `id` uuid pk
   - `user_id` uuid not null
   - `library_id` uuid not null fk -> `libraries.id` cascade delete
   - `title` text not null default `'New chat'`
   - `last_message_at` timestamptz nullable
   - `created_at`, `updated_at` timestamptz not null default now
   - indexes: `(library_id)`, `(user_id)`, `(last_message_at desc)`
   - RLS policies: select/insert/update/delete own rows (`auth.uid() = user_id`)

2. `chat_messages`
   - `id` uuid pk
   - `user_id` uuid not null
   - `library_id` uuid not null fk -> `libraries.id` cascade delete
   - `session_id` uuid not null fk -> `chat_sessions.id` cascade delete
   - `role` text not null (`'user' | 'assistant'`)
   - `content` text not null
   - `model` text nullable
   - `status` text not null default `'completed'` (`'completed' | 'aborted' | 'failed'`)
   - `input_tokens` integer nullable  ← maps from AI SDK `totalUsage.inputTokens`
   - `output_tokens` integer nullable ← maps from AI SDK `totalUsage.outputTokens`
   - `total_tokens` integer nullable  ← maps from AI SDK `totalUsage.totalTokens`
   - `sources_json` jsonb nullable
   - `evidence_json` jsonb nullable
   - `created_at`, `updated_at` timestamptz not null default now
   - indexes: `(session_id, created_at)`, `(library_id)`, `(user_id)`
   - RLS policies: select/insert/update/delete own rows (`auth.uid() = user_id`)

**Note on token field names**: AI SDK uses `inputTokens`/`outputTokens`. Column names in the DB are `input_tokens`/`output_tokens` to match. The route handler maps these to `inputTokens`/`outputTokens` in the API response.

### Migration

1. Run `npm run db:generate`.
2. Review generated migration and snapshot changes.

### Completion check

- Migration is generated (not hand-written).
- New tables, indexes, and policies are present.

## Phase 3 - Validation and API types

### Add

- `src/lib/validation/chat.ts`

### Schemas

- `createChatSessionSchema`: optional empty payload.
- `sendChatMessageSchema`
  - `content`: string, trim, min 1, max 4000.
- `listChatMessagesQuerySchema`
  - `limit`: int 1..100 default 50
  - `cursor`: ISO timestamp optional

### Completion check

- Route handlers can parse all payloads and query params with Zod.

## Phase 4 - Query layer

### Add

- `src/server/chat/queries.ts`

### Functions

1. `listChatSessions(userId, libraryId)`
2. `createChatSession(userId, libraryId)`
3. `getChatSessionById(userId, libraryId, sessionId)`
4. `listChatMessages(userId, libraryId, sessionId, { limit, cursor })`
5. `insertUserMessage(...)`
6. `insertAssistantMessage(...)`
7. `updateSessionAfterMessage(sessionId, title?, lastMessageAt)`

### Completion check

- All reads/writes are ownership-scoped (`user_id` and `library_id`).

## Phase 5 - Retrieval implementation

### Add

- `src/server/chat/retrieval.ts`

### Retrieval methods (run in parallel)

1. chunk vector search over `video_chunks`
2. insight vector search over `video_insights`
3. chunk full-text search over `video_chunks`

### Required filters on every retrieval query

- same `user_id`
- same `library_id`
- join/filter to `videos.status = 'ready'`

### Suggested limits

- pre-fusion candidates:
  - chunk vector: 40
  - insight vector: 20
  - chunk fts: 25

### Completion check

- Retrieval returns candidates from all three channels with source metadata.

## Phase 6 - Fusion and normalization

### Add

- `src/server/chat/fusion.ts`

### Normalization rules (explicit)

- Vector score: `vec_norm = clamp(1 - cosine_distance, 0, 1)`
- FTS score: `fts_norm = clamp(ts_rank_cd / 0.4, 0, 1)`

### Weighted fusion (MVP)

- `score = 0.45 * chunk_vec + 0.35 * insight_vec + 0.20 * fts_norm`

### Rank controls

- de-duplicate near-identical chunk text
- cap chunks per video (for diversity)
- retain enough chunk evidence for timestamps in sources

### Weak evidence policy

- If top fused evidence is below threshold, answer with explicit uncertainty.
- Do not fabricate claims.

### Completion check

- Fusion output is deterministic and reproducible for same input.

## Phase 7 - Sources rollup formatter

### Add

- `src/server/chat/sources.ts`

### Responsibilities

- Group evidence by video title and id.
- Aggregate unique timestamps per video.
- Build YouTube links: `https://youtube.com/watch?v=VIDEO_ID&t=SECONDS`.
- Return top 3-5 videos for UI, plus `extraVideos` count.
- Preserve full evidence separately for internal persistence (`evidence_json`).

### Completion check

- API response contains compact source rollup with grouped timestamps.

## Phase 8 - Billing interface stub (no-op for now)

### Add

- `src/server/billing/credits.ts`

### Interface

- `checkAndDeductCredits(params: { userId: string; modelId: string; modelAlias: 'chat.fast' | 'chat.smart'; operation: 'chat_message' }): Promise<void>`

### Behavior now

- No-op pass by default.
- Contract supports throwing `AppError` with code `INSUFFICIENT_CREDITS` and `httpStatus: 402`.

### Completion check

- Service calls this before any OpenAI work.

## Phase 9 - Chat service orchestrator with streaming

### Add

- `src/server/chat/openai.ts`
- `src/server/chat/service.ts`

### `openai.ts` responsibilities

- query rewrite helper (retrieval-friendly rewrite)
- stream generation helper using Vercel AI SDK
- reuse shared OpenAI core utilities where applicable
- emit `$ai_generation` for rewrite and generation

**AI SDK v6 import pattern** (required):
```ts
import { openai } from '@ai-sdk/openai';           // provider
import { streamText, convertToModelMessages } from 'ai'; // core

const result = streamText({
  model: openai('<resolved-chat-model-id>'),
  messages: convertToModelMessages(historyAsUIMessages),
  // ...
});
```

`convertToModelMessages` converts `UIMessage[]` to `ModelMessage[]` for the model call. In AI SDK v6 it is async and must be awaited.

### `service.ts` flow

1. Validate library/session ownership.
2. Call `checkAndDeductCredits` before embedding/generation.
3. Persist user message.
4. If first user message and session title is default, set title to truncated first message (60 chars).
5. Generate retrieval rewrite.
6. Embed question/rewrite using shared embedding util.
7. Run retrieval channels in parallel.
8. Fuse and select context.
9. Fetch conversation history inside service.
10. Token budget policy:
    - max 12 prior messages
    - history budget cap: 3000 input tokens
    - retrieval context budget cap: 7000 input tokens
    - output cap: configurable by env per tier (`OPENAI_CHAT_MAX_OUTPUT_TOKENS_FAST` / `OPENAI_CHAT_MAX_OUTPUT_TOKENS_SMART`)
    - trim history first if over budget
11. Build prompt with context + instruction to return compact `Sources` block.
12. Start stream to client.
13. On stream finish (inside `toUIMessageStreamResponse({ onFinish })`):
    - persist assistant message using `totalUsage.inputTokens`, `totalUsage.outputTokens`, `totalUsage.totalTokens`
    - persist `sources_json` + `evidence_json`
    - set message status using `finishReason`:
      - `'stop'` or `'length'` → `'completed'`
      - `'error'` → `'failed'`
      - any other reason → `'aborted'`
    - pass `abortSignal: request.signal` to `streamText` so client disconnect cancels the LLM call
    - update `chat_sessions.last_message_at`
    - emit `chat_message_sent` when persisted assistant status is `completed`
    - track cap hits with `$ai_generation.finish_reason = 'length'`

**AI SDK v6 `onFinish` usage**:
```ts
return result.toUIMessageStreamResponse({
  messageMetadata: ({ part }) => {
    if (part.type === 'finish') {
      return { sources: sourcesRollup };
    }
  },
  onFinish: async ({ totalUsage, finishReason }) => {
    // totalUsage.inputTokens, totalUsage.outputTokens, totalUsage.totalTokens
    const status = finishReason === 'stop' || finishReason === 'length'
      ? 'completed'
      : finishReason === 'error'
        ? 'failed'
        : 'aborted';
    await insertAssistantMessage({ ..., inputTokens: totalUsage.inputTokens, ... });
    await updateSessionAfterMessage(...);
    if (status === 'completed') await captureServerEvent(userId, 'chat_message_sent', ...);
  },
});
```

### Completion check

- Route can return a streaming response.
- Assistant message persistence happens in finish callback with correct status.

## Phase 10 - API routes

### Add

- `src/app/api/libraries/[libraryId]/chat/sessions/route.ts`
- `src/app/api/libraries/[libraryId]/chat/sessions/[sessionId]/route.ts`
- `src/app/api/libraries/[libraryId]/chat/sessions/[sessionId]/messages/route.ts`

### Route contracts

#### `GET /api/libraries/:libraryId/chat/sessions`

Response `200`:

```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "string",
      "createdAt": "iso",
      "updatedAt": "iso",
      "lastMessageAt": "iso|null",
      "messageCount": 0
    }
  ]
}
```

#### `POST /api/libraries/:libraryId/chat/sessions`

Request body:

```json
{}
```

Response `201`:

```json
{
  "session": {
    "id": "uuid",
    "title": "New chat",
    "createdAt": "iso",
    "updatedAt": "iso",
    "lastMessageAt": null
  }
}
```

#### `DELETE /api/libraries/:libraryId/chat/sessions/:sessionId`

Response `200`:

```json
{
  "ok": true
}
```

Response `404`:

- `{ "error": "Library not found." }` when the library does not exist for the user.
- `{ "error": "Chat session not found." }` when the session id is missing for that library.

#### `GET /api/libraries/:libraryId/chat/sessions/:sessionId/messages?limit=50&cursor=...`

Response `200`:

```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "string",
      "createdAt": "iso",
      "model": null,
      "status": "completed",
      "usage": null,
      "sources": null
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "string",
      "createdAt": "iso",
      "model": "<resolved-chat-model-id>",
      "status": "completed",
      "usage": {
        "inputTokens": 123,
        "outputTokens": 456,
        "totalTokens": 579
      },
      "sources": {
        "videos": [
          {
            "videoId": "uuid",
            "youtubeVideoId": "string",
            "title": "Video title",
            "timestamps": [
              {
                "seconds": 130,
                "label": "02:10",
                "url": "https://youtube.com/watch?v=abc&t=130"
              }
            ]
          }
        ],
        "extraVideos": 2
      }
    }
  ],
  "nextCursor": null
}
```

#### `POST /api/libraries/:libraryId/chat/sessions/:sessionId/messages`

Request body:

```json
{
  "content": "What are recurring tactics mentioned across these videos?"
}
```

Response `200`:

- Content type: `text/plain; charset=utf-8` (Vercel AI SDK UI message stream protocol)
- Body: UI message stream parts (text deltas + finish metadata with sources)
- Produced by `result.toUIMessageStreamResponse()` from `streamText`
- Consumed by `useChat` with `DefaultChatTransport` on the client

Error responses (all routes):

- JSON `{ "error": "..." }` with provider-agnostic messages.
- `402` for insufficient credits once billing is enabled.

### Completion check

- Routes compile and match contracts exactly.

## Phase 11 - Observability and error handling

### Tasks

1. Ensure `$ai_generation` events are emitted for:
   - query rewrite
   - query embeddings
   - chat generation
2. Emit `chat_message_sent` after successful assistant message persistence.
3. Emit `upgrade_prompt_shown` on insufficient credits path.
4. Send technical details to Sentry/logs, never to user-facing errors.

### Completion check

- Event names and properties follow existing analytics patterns.

## Phase 12 - Verification and quality gates

Run after implementation is complete:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`

Manual validation checklist:

1. Create session.
2. Send first message and confirm title auto-updates.
3. Confirm response streams token-by-token.
4. Confirm messages persist in DB with usage and status.
5. Confirm sources rollup appears and links include timestamps.
6. Confirm only ready videos are used in retrieval.
7. Simulate weak evidence and confirm uncertainty response.
8. Simulate abort and confirm assistant status is `aborted`.

## Phase 13 - Docs and task tracking updates

Before closing implementation PR:

1. Update `docs/tasks.md`
   - mark library chat and persisted chat history as complete.
2. Ensure `docs/rag-chat.md` and `docs/retrieval-architecture.md` reflect implemented behavior.
3. Ensure `AGENTS.md` locked stack choices include streaming transport decision.

## Out of scope for this implementation

- Cross-library retrieval
- Reranker model
- Query decomposition
- Billing logic beyond the stubbed credit-check interface

## Definition of done (backend)

Backend is complete when all of the following are true:

1. Streaming chat backend works end-to-end for one library.
2. Hybrid retrieval, deterministic fusion, and compact sources rollup are in place.
3. Chat sessions and message history are persisted with RLS.
4. Conversation history is included with enforced token budget limits.
5. Provider-agnostic error messaging and analytics invariants are satisfied.
6. Docs and tasks are updated in the same PR.

---

## Frontend Implementation

See `docs/chat-ui-implementation-plan.md` for the complete UI implementation plan.

That document covers: package installation (AI SDK v6), feature types and API client, TanStack Query hooks, sidebar session list, route pages, all chat components (`ChatView`, `ChatMessageList`, `ChatMessage`, `ChatInput`, `ChatSources`, `EmptyChatState`), streaming UX polish, accessibility requirements, and the full verification checklist.

Key integration points between this plan and the UI plan:

- The UI plan's Phase 14 (package install) must run before backend Phase 9 can be compiled.
- The UI plan's package install should use `react-markdown@^10` and `remark-gfm@^4` (current maintained majors) with safe defaults (`skipHtml`, no `rehype-raw`).
- The streaming route (Phase 10 here) must return `result.toUIMessageStreamResponse()` with `messageMetadata` for sources - this is what `useChat`'s `DefaultChatTransport` consumes on the client.
- The GET messages route (Phase 10 here) must return `inputTokens`/`outputTokens` - the UI plan's `ChatMessageItem.usage` type reflects this.
- The session auto-title (Phase 9 here, step 4) is what the UI's `onFinish` query invalidation picks up to refresh the sidebar.
