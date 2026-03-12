# Ingestion Pipeline

The ingestion flow runs entirely through Inngest durable functions. Each step retries independently on failure.

Retrieval contracts are defined in `docs/retrieval-architecture.md`.

MVP model policy: OpenAI-only for generation and embeddings.

Database requirement: `pgvector` must be enabled to store and query embeddings.

---

## Flow: Source Added

When a user adds a source URL:

1. `source.added` event fired
2. Inngest function discovers all video IDs from the URL via YouTube Data API (channel to uploads playlist, playlist pagination, single video to single ID)
3. Video rows created with `status: 'pending'`
4. Fan-out: one `video.ingest` event fired per video
5. Source row status moves from `processing` to `ready` (or `failed` if setup fails)

Duplicate sources are blocked per library using a canonical `source_key` (video ID, playlist ID, or channel reference). If a duplicate is submitted, the API returns a conflict response and no ingestion event is sent.

If queueing fails when adding a source, the source insert is rolled back and the API returns a generic retry message.

---

## Flow: Per-Video Ingestion (`video.ingest`)

1. Fetch transcript from TranscriptAPI.com - stored as `transcript_raw`
2. Chunk transcript (see Chunking Strategy below)
3. Generate embeddings for chunks via OpenAI - upsert `video_chunks` rows
4. Generate insight objects via OpenAI (`gpt-4.1-mini`) and embeddings via OpenAI (`text-embedding-3-small`) - upsert `video_insights` rows
5. Update `status: 'ready'`

### Artifacts Written

- `videos`: transcript payload and ingestion status
- `video_chunks`: `video_id`, `chunk_index`, `chunk_text`, `start_seconds`, `end_seconds`, `embedding`
- `video_insights`: `video_id`, `insight_type`, `content`, `embedding`

All writes are idempotent. Retries must update existing rows for the same `(video_id, chunk_index)` and `(video_id, insight_type)` instead of creating duplicates.

---

## Failure Handling

`video.ingest` uses an explicit max of 3 attempts. A video is always marked `'failed'` at the end of the final attempt.

Transcript-unavailable failures are treated as terminal on the first attempt, marked `'failed'` immediately, and are not retried.

If TranscriptAPI fails (video has no captions), status is set to `'failed'` with an error reason. These are surfaced in the UI. Whisper fallback is post-MVP.

User-facing errors must stay provider-agnostic. Include technical provider details only in logs and Sentry.

---

## UI Progress Visibility

The library UI reads ingestion progress from `GET /api/libraries/[libraryId]/videos`.

Response contract includes:

- Per-video status rows (`pending`, `processing`, `ready`, `failed`)
- Aggregate counts (`total`, `pending`, `processing`, `ready`, `failed`)
- Derived state flags (`hasInFlight`, `isProcessing`, `isSettled`)

Polling behavior:

- Poll every 3 seconds while `hasInFlight` is true
- Poll every 3 seconds while `isProcessing` is true (source setup is in progress)
- Stop polling once all videos are settled

The floating progress indicator appears while ingestion is active, briefly shows completion, then dismisses itself.

---

## Concurrency

Max 5 concurrent `video.ingest` functions per user to avoid hammering external APIs.

---

## Chunking Strategy

YouTube transcripts from TranscriptAPI come as timestamped segments (each segment has text + start time). Use these natural boundaries rather than arbitrary character splits.

**Parameters:**

- Chunk size: 300-400 tokens (not characters - use tiktoken to count)
- Overlap: ~15% (~45-60 tokens)
- Split boundary: TranscriptAPI segment breaks, merged until token limit is reached. Never split mid-segment.

**Metadata stored on every chunk:**

- `video_id`, `video_title`, `start_seconds`, `end_seconds`
- This enables grouped source links with timestamps in chat

**Rationale:** Small enough chunks give precise retrieval. Segment-aware splitting preserves natural speech units. Overlap prevents losing context at boundaries. The unit is tokens not characters because that is what the embedding model processes.

**Note on tuning:** These are MVP defaults. Once real user queries exist, evaluate retrieval quality and tune chunk size, overlap, and ranking weights.
