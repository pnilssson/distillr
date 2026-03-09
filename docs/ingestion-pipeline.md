# Ingestion Pipeline

The ingestion flow runs entirely through Inngest durable functions. Each step retries independently on failure.

---

## Flow: Source Added

When a user adds a source URL:

1. `source.added` event fired
2. Inngest function discovers all video IDs from the URL (channel to video list, playlist to video list, single video to single ID)
3. Video rows created with `status: 'pending'`
4. Fan-out: one `video.ingest` event fired per video

---

## Flow: Per-Video Ingestion (`video.ingest`)

1. Fetch transcript from TranscriptAPI.com - stored as `transcript_raw`
2. Generate summary + key insights via Claude Haiku - cached on video row
3. Chunk transcript (see Chunking Strategy below)
4. Generate embeddings via OpenAI - insert `video_chunks` rows
5. Update `status: 'ready'`

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

- `video_id`, `video_title`, `start_time` (seconds), `end_time` (seconds)
- This enables timestamp-linked citations in chat

**Rationale:** Small enough chunks give precise retrieval. Segment-aware splitting preserves natural speech units. Overlap prevents losing context at boundaries. The unit is tokens not characters because that is what the embedding model processes.

**Note on tuning:** Chunk parameters are a starting point, not gospel. Once real users and real queries exist, evaluate retrieval quality and adjust. Do not over-engineer this before launch.
