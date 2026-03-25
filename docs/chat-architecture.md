# Chat Architecture

## Purpose

Distillr chat answers questions over one library using hybrid retrieval and streamed generation. It persists chat history, usage metrics, and compact source rollups for traceable answers.

Chat contracts are forward-only and source-agnostic.

## Forward-Only Policy

- No compatibility support for legacy source rollup shapes.
- No dual payload formats in `sources_json`.
- No provider-specific source payload shapes as the canonical contract.

## Scope

- Scope: one user, one library, ready content items only.
- Modes: `auto | library | chat`.
- Model tiers: `fast` (alias `chat.fast`, Nano), `smart` (alias `chat.smart`, Mini), or `pro` (alias `chat.pro`, Smart), selected per request by the user. Defaults to `smart` (Mini).
- Transport: Vercel AI SDK v6 UI message stream protocol.
- Models (MVP): OpenAI only - `gpt-5.4-nano` (Nano), `gpt-5.4-mini` (Mini, default), `gpt-5.4` (Smart). Provider/model resolved via `src/server/core/ai/models.ts`.

## Request Flow

1. `POST /api/libraries/[libraryId]/chat/sessions/[sessionId]/messages` receives message, mode, and model alias.
2. Service validates session ownership.
3. Preflight billing check runs before model work.
4. User message is persisted immediately.
5. Effective mode is resolved:
   - `auto` uses structured intent routing.
   - `library` forces retrieval.
   - `chat` skips retrieval.
6. In `library` mode, rewrite + embedding + hybrid retrieval run.
7. Retrieval candidates are fused into ranked evidence.
8. Prompt is built with bounded history and bounded retrieval context.
9. Response streams to client.
10. On finish, assistant message is persisted with usage and status.

## Retrieval Model

Hybrid retrieval runs in parallel:

- chunk vector search over `content_chunks`
- insight vector search over `content_insights`
- full-text search over `content_chunks`

Retrieval remains scoped to one library and `content_items.status = 'ready'`.

Deterministic normalization and fusion:

- `vec_norm = clamp(1 - cosine_distance, 0, 1)`
- `fts_norm = clamp(ts_rank_cd / 0.4, 0, 1)`
- `fused_score = 0.45 * chunk_vec + 0.35 * insight_vec + 0.20 * fts_norm`

Weak evidence policy:

- Avoid guessing.
- Give the strongest supported answer first.
- Use concise uncertainty phrasing when support is weak.
- Do not discuss retrieval mechanics in user-facing text.

## Source Rollup Contract

Canonical chat source contract is item-level with optional typed anchors:

```ts
type ChatSourceItem = {
  itemId: string;
  externalId: string;
  contentType: string;
  title: string;
  url: string;
  referenceCount: number;
  anchors: Array<{
    anchorType: "timecode" | "page" | "section" | "char_range";
    label: string | null;
    url: string;
  }>;
};

type ChatSourcesRollup = {
  items: ChatSourceItem[];
};
```

Rules:

- No `extraVideos` summary counter in persisted source payload.
- `chat` mode responses do not include sources.
- Full evidence remains in `evidence_json` for internal debugging.

Anchors:

- Anchors are optional and provider-emitted.
- YouTube currently emits timecode anchors.
- Future providers can emit page, section, or char-range anchors without changing the top-level rollup schema.

## Persistence Model

- Tables: `chat_sessions`, `chat_messages`.
- `chat_messages` stores:
  - `requested_mode`, `effective_mode`
  - `status` (`completed`, `aborted`, `failed`)
  - token usage (`input_tokens`, `output_tokens`, `total_tokens`)
  - `sources_json` and `evidence_json`
- First user message auto-updates default session title.

Finish reason mapping:

- `stop` or `length` -> `completed`
- `error` -> `failed`
- all other reasons -> `aborted`

## Budget and Guardrails

- History window: up to 12 prior messages.
- History token budget: 3000.
- Retrieval context budget: 7000.
- Output token cap is model-configured by env.

## Billing Integration

- Preflight check uses Polar snapshot and denies when balance is below 1 credit.
- On successful or aborted assistant messages with usage, service emits `billing.usage.chat.record`.
- Usage ingestion to Polar is async. Reconciliation covers missed dispatches.

## UX and API Contract

- Client uses `useChat` with `DefaultChatTransport`.
- Stream response is returned via `toUIMessageStreamResponse()`.
- Server uses `consumeSseStream` so finish callbacks run on abort/disconnect.
- Sidebar session list refreshes after stream finish to reflect title/recency updates.
- Sources UI renders item-level links and optional anchor links, and may collapse long lists behind a reveal interaction.
- Chat session exports are available at `GET /api/libraries/[libraryId]/chat/sessions/[sessionId]/export?format=txt|md|pdf`.
- Export route ownership checks match chat message ownership checks and applies billing export entitlements.

## Observability

- Track AI calls via `$ai_generation` (provider, model, alias, tokens, latency, cost).
- Track `chat_message_sent` when assistant message persists as `completed`.
- Track `upgrade_prompt_shown` when preflight credits are insufficient.
- Send technical exceptions to Sentry with context.

## Key Entry Points

- `src/server/chat/service.ts`
- `src/server/chat/ai.ts`
- `src/server/chat/retrieval.ts`
- `src/server/chat/fusion.ts`
- `src/server/chat/sources.ts`
- `src/server/chat/queries.ts`
- `src/features/chat/ChatSources.tsx`
- `src/app/api/libraries/[libraryId]/chat/sessions/[sessionId]/messages/route.ts`
- `src/app/api/libraries/[libraryId]/chat/sessions/[sessionId]/export/route.ts`

## Safe Change Checklist

When changing chat behavior:

1. Keep ownership checks and provider-agnostic errors intact.
2. Keep retrieval scoped to one library and `content_items.status = 'ready'`.
3. Preserve deterministic fusion unless intentionally reworked.
4. Preserve stream-finish persistence guarantees.
5. Do not introduce compatibility rollup shapes or legacy aliases.
6. Verify `npm run typecheck`, `npm run lint`, and `npm run build`.
7. Update this file when mode semantics, scoring, budgets, or status mapping changes.
