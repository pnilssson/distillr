# Ingestion Architecture

## Purpose

Distillr ingests YouTube sources into retrieval-ready artifacts (`video_chunks`, `video_insights`) through durable Inngest workflows. The ingestion system is designed to be idempotent, retry-safe, and user-isolated.

## Scope

- Input types: YouTube channel, playlist, and single video URLs.
- Scope of processing: one user, one library.
- Output: `videos` status + transcript metadata, chunk embeddings, and insight embeddings.
- Retrieval eligibility: only videos with `videos.status = 'ready'`.

## Pipeline Overview

1. User adds source via API.
2. API enqueues `source.added` event.
3. `source-added` function discovers videos, upserts rows, applies allowance gating, and enqueues `video.ingest` events.
4. `video-ingest` function processes each video to completion (`ready`) or terminal failure (`failed`).

## Source Planning (`source.added`)

- Function: `src/server/inngest/functions/source-added.ts`
- Concurrency: serialized per user (`limit: 1`, key `event.data.userId`) to avoid over-queue races.
- Discovery: `discoverVideosFromSource()` resolves canonical video IDs.
- Upsert strategy: idempotent upsert by `(library_id, youtube_video_id)`.
- Queue eligibility: only rows currently `pending` or `failed` are re-queued.
- Billing-aware gating:
  - resolves monthly and lifetime remaining allowances from Polar customer state.
  - queues only allowed count.
  - marks overflow rows `failed` with provider-agnostic limit reasons.

## Per-Video Processing (`video.ingest`)

- Function: `src/server/inngest/functions/video-ingest.ts`
- Concurrency: max 5 concurrent runs per user.
- Steps:
  1. Mark video `processing`.
  2. Fetch transcript.
  3. Chunk transcript with token-aware segment boundaries.
  4. Embed chunks and upsert `video_chunks`.
  5. Generate structured insights and embed/upsert `video_insights`.
  6. Mark video `ready` and persist transcript/summary metadata.
  7. Emit `billing.usage.video.record` event.
  8. Emit analytics event `video_ready`.

## Idempotency and Data Guarantees

- `video_chunks` upsert target: `(video_id, chunk_index)`.
- `video_insights` upsert target: `(video_id, insight_type)`.
- Stale rows are deleted when a later successful run produces fewer chunks/insights.
- Retry runs converge on latest transcript-derived state, not duplicate rows.

## Failure Model

- Source function retries up to 3 attempts.
- Video function retries up to 3 attempts.
- Terminal classification uses ingestion error policy (`classifyIngestionError`).
- On terminal video failure, row is marked `failed` and `video_failed` analytics is emitted.
- User-visible reasons remain provider-agnostic; technical details go to Sentry.

## UI Contract

- Video statuses exposed via `GET /api/libraries/[libraryId]/videos`.
- Status values: `pending`, `processing`, `ready`, `failed`.
- Counts and settled/in-flight flags drive sidebar polling and progress display.
- Source refresh is available via `POST /api/libraries/[libraryId]/sources/[sourceId]/retry`, which reuses `source.added` to re-discover videos and re-queue `failed` or `pending` items.

## Key Invariants

- Never bypass Inngest for ingestion work.
- Never write embeddings directly from client code.
- Never include non-ready videos in retrieval.
- Keep all customer-facing errors provider-agnostic.

## Key Entry Points

- `src/app/api/libraries/[libraryId]/sources/route.ts`
- `src/server/inngest/functions/source-added.ts`
- `src/server/inngest/functions/video-ingest.ts`
- `src/server/ingestion/chunking.ts`
- `src/server/ingestion/openai.ts`

## Safe Change Checklist

When changing ingestion behavior:

1. Preserve idempotent upsert semantics.
2. Preserve per-user queue safety (`source.added` serialization).
3. Preserve provider-agnostic user messaging.
4. Verify `npm run typecheck`, `npm run lint`, and `npm run build`.
5. Update this file if step order, retries, limits, or statuses change.
