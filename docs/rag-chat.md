# RAG / Chat Architecture

Retrieval contracts are defined in `docs/retrieval-architecture.md`.

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
7. Prompt is sent to Claude Sonnet (`claude-sonnet-4-6`) with context + conversation history
8. Response streams back via Vercel AI SDK
9. Message pair is saved to `chat_messages` with token counts

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
