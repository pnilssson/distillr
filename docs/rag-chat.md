# RAG / Chat Architecture

Retrieval contracts are defined in `docs/retrieval-architecture.md`.

MVP model policy: OpenAI-only for generation and embeddings.

## Query Flow

1. User submits a question in the library chat
2. System normalizes the question and generates a retrieval-friendly rewrite
3. Question is embedded via OpenAI (`text-embedding-3-small`)
4. Retrieval runs in parallel, scoped to one library and `ready` videos:
   - `match_chunks_vector()` over `video_chunks`
   - `match_insights_vector()` over `video_insights`
   - `match_chunks_fts()` over `video_chunks`
5. Candidates are merged and ranked into one evidence set (MVP: deterministic weighted fusion)
6. Top evidence is assembled into context and source candidates (video title + timestamp links)
7. Prompt is sent to OpenAI (alias-based chat model config - `chat.fast`/`chat.smart`) with context + conversation history
   - Retrieved context is treated as untrusted data and never as instructions
   - Generation enforces an explicit max output token cap per chat tier
   - Caps are configurable with `OPENAI_CHAT_MAX_OUTPUT_TOKENS_FAST` and `OPENAI_CHAT_MAX_OUTPUT_TOKENS_SMART`
8. Response streams back via Vercel AI SDK v6 using `toUIMessageStreamResponse()`
9. Assistant message persistence happens in the stream finish callback with usage fields (`inputTokens`, `outputTokens`, `totalTokens`)

---

## Sources Format

Every answer ends with one compact `Sources` block:

```
Sources (showing top 3-5 videos)
1. Video Title A (02:10, 14:22)
2. Video Title B (05:44)
... +N more videos used
```

- No inline citations in the answer body for MVP.
- Timestamps are grouped by video title.
- Source links use `youtube.com/watch?v=ID&t=SECONDS`.
- UI shows top 3-5 videos only. Full evidence is retained internally.

If evidence is insufficient, the assistant should say that directly and avoid fabricated claims.

---

## Scope

Chat is scoped to a single library (all ready videos within it). Cross-library search is post-MVP.

---

## Persistence

All chat sessions and messages are persisted per library. Token counts are stored on each message for usage metering.

Streaming and persistence contract:

- Client transport uses `DefaultChatTransport` against `POST /api/libraries/:libraryId/chat/sessions/:sessionId/messages`.
- Route response is Vercel AI SDK UI message stream protocol (`text/plain; charset=utf-8`) from `result.toUIMessageStreamResponse()`.
- Route uses `consumeSseStream` to ensure `onFinish` runs for aborted/disconnected streams.
- User message is persisted before retrieval and generation begin.
- Assistant message is persisted only in `onFinish`, with `sources_json` + `evidence_json` and usage totals.
- `finishReason === 'stop'` or `finishReason === 'length'` persists assistant status `completed`.
- `finishReason === 'error'` persists assistant status `failed`.
- Other non-`stop` reasons (for example abort/disconnect) persist assistant status `aborted`.
- Request `abortSignal` is passed into model generation so client disconnect cancels ongoing generation.
- Chat mode routing supports `auto | library | chat` and is persisted per message (`requested_mode` + `effective_mode`).
