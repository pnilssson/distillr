# RAG / Chat Architecture

## Query Flow

1. User submits a question in the library chat
2. Question is embedded via OpenAI (same model as chunks: `text-embedding-3-small`)
3. Supabase `match_chunks()` function runs vector cosine similarity search, scoped to the library, returns top 8 chunks with video metadata + timestamps
4. Chunks are assembled into a context block with source citations (video title + timestamp links)
5. Prompt is sent to Claude Sonnet (`claude-sonnet-4-6`) with the context + conversation history
6. Response streams back via Vercel AI SDK
7. Message pair saved to `chat_messages` with token counts

---

## Citation Format

Every answer includes inline references linking back to the source video at the exact timestamp:

```
[Source: Video Title - 12:34]
```

Links to: `youtube.com/watch?v=ID&t=754`

---

## Scope

Chat is scoped to a single library (all ready videos within it). Cross-library search is post-MVP.

---

## Persistence

All chat sessions and messages are persisted per library. Token counts are stored on each message for usage metering.
