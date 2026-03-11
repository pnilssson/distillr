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

If TranscriptAPI fails (video has no captions), status is set to `'failed'` with an error reason. These are surfaced in the UI. Whisper fallback is post-MVP.

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
