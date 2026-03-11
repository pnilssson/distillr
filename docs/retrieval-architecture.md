# Retrieval Architecture

This is the source of truth for how retrieval works across ingestion and chat.

## Goal

Answer both conceptual questions and exact lookups over YouTube transcripts, with compact timestamp-linked sources, scoped to one library.

## Core Retrieval Model

Retrieval is semantic-first, not keyword-only.

- Semantic search (embeddings) handles meaning-level matches.
- Full-text search handles exact terms (names, tools, acronyms, exact phrases).
- Hybrid retrieval combines both for better recall and precision.

## Indexed Artifacts

### `video_chunks`

Raw transcript chunks for detailed evidence and timestamped source links.

Required fields:

- `video_id`
- `chunk_index`
- `chunk_text`
- `start_seconds`
- `end_seconds`
- `embedding` (`text-embedding-3-small`)

### `video_insights`

AI-generated per-video knowledge objects for higher-level retrieval.

Required fields:

- `video_id`
- `insight_type` (for example: `summary`, `key_points`, `tactics`, `objections`, `tools`)
- `content`
- `embedding` (`text-embedding-3-small`)

## Query-Time Pipeline

1. Normalize user question and generate one retrieval-friendly rewrite.
2. Create query embeddings for original question and rewrite.
3. Run retrieval in parallel:
   - vector search over `video_chunks`
   - vector search over `video_insights`
   - full-text search over `video_chunks`
4. Merge and rank candidates with a deterministic strategy (MVP: weighted score fusion).
5. Build context block with source diversity and token budget limits.
6. Generate answer with Claude Sonnet (`claude-sonnet-4-6`).
7. Return a synthesized answer with a compact `Sources` block and persist chat messages + usage metrics.

## Evidence and Citation Policy

- Every non-trivial claim in the final answer should be grounded in retrieved context.

- MVP response format:

```text
Sources (showing top 3-5 videos)
1. Video Title A (02:10, 14:22)
2. Video Title B (05:44)
3. Video Title C (11:08)
... +N more videos used
```

- Group timestamps by video title in one source rollup.
- Show only top 3-5 most influential videos in UI.
- Keep full evidence references internally for debugging and future expandability.
- Link target format: `youtube.com/watch?v=VIDEO_ID&t=SECONDS`.
- If evidence is weak or conflicting, explicitly say so instead of guessing.

## Scope

- Retrieval is limited to one library.
- Only `videos.status = 'ready'` is eligible.
- Cross-library retrieval is post-MVP.

## MVP vs V2

MVP:

- Hybrid retrieval (chunks vector + insights vector + chunks FTS)
- Deterministic merge/rank
- Compact source rollup with timestamp links (top 3-5 videos)

V2:

- Optional reranking model before final context assembly
- Query decomposition for broad multi-part questions
- Advanced ranking features (recency, creator affinity, feedback signals)
- Expandable evidence view with full chunk-level provenance
