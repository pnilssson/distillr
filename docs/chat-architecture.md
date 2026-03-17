# Chat Architecture

## Purpose

Distillr chat answers questions over one library using hybrid retrieval plus streamed generation. It persists full chat history, usage metrics, and compact source rollups for traceable answers.

## Scope

- Scope: one user, one library, ready videos only.
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
6. In `library` mode, query rewrite + embedding + hybrid retrieval run.
7. Retrieval candidates are fused into ranked evidence.
8. Prompt is built with bounded history and bounded retrieval context.
9. Response streams to client.
10. On stream finish, assistant message is persisted with usage and status.

## Retrieval Model

Hybrid retrieval runs in parallel:

- chunk vector search over `video_chunks`
- insight vector search over `video_insights`
- full-text search over `video_chunks`

Deterministic normalization and fusion:

- `vec_norm = clamp(1 - cosine_distance, 0, 1)`
- `fts_norm = clamp(ts_rank_cd / 0.4, 0, 1)`
- `fused_score = 0.45 * chunk_vec + 0.35 * insight_vec + 0.20 * fts_norm`

Weak evidence policy:

- If evidence quality is weak, assistant must avoid guessing, give the strongest supported answer first, and use concise uncertainty language.
- Assistant should not discuss retrieval mechanics in user-facing phrasing (for example, avoid terms like "patchy evidence").

## Source Rollup Contract

- Chat answers include a compact `Sources` rollup (top 3-5 videos).
- Each source includes grouped timestamps with YouTube links (`watch?v=ID&t=SECONDS`).
- Full evidence is persisted for internal debugging and future UI expansion.
- `chat` mode responses do not include sources.

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

- Preflight check uses Polar snapshot and denies when balance is below 1 credit (MVP behavior).
- On successful/aborted assistant messages with token usage, service emits `billing.usage.chat.record` to Inngest.
- Usage ingestion to Polar is asynchronous; reconciliation covers missed dispatches.

## UX and API Contract

- Client uses `useChat` with `DefaultChatTransport`.
- Stream response is returned via `toUIMessageStreamResponse()`.
- Server uses `consumeSseStream` to ensure finish callbacks run on abort/disconnect.
- Sidebar session list refreshes after stream finish to reflect title/recency updates.

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
- `src/app/api/libraries/[libraryId]/chat/sessions/[sessionId]/messages/route.ts`

## Safe Change Checklist

When changing chat behavior:

1. Keep ownership checks and provider-agnostic errors intact.
2. Keep retrieval scoped to one library and `videos.status = 'ready'`.
3. Preserve deterministic fusion unless intentionally reworked.
4. Preserve stream-finish persistence guarantees.
5. Verify `npm run typecheck`, `npm run lint`, and `npm run build`.
6. Update this file when mode semantics, scoring, budgets, or status mapping changes.
