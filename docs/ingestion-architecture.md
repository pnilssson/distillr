# Ingestion Architecture

## Purpose

Distillr ingests source content into retrieval-ready artifacts (`content_chunks`, `content_insights`, `content_chunk_anchors`) through durable Inngest workflows. The architecture is source-agnostic by contract, currently implemented with a YouTube provider only.

The ingestion system is idempotent, retry-safe, and tenant-isolated.

## Forward-Only Policy

- No compatibility shims.
- No dual-write or alias paths.
- No legacy payload support in runtime code.
- If schema changes invalidate old ingestion rows, wipe ingestion-derived data before rollout.

This project is pre-user. Clean architecture is prioritized over preserving old dev data.

## Scope

- Source inputs currently supported: YouTube channel, playlist, and single video URLs.
- Processing scope: one user, one library.
- Output: item status in `content_items`, chunk embeddings, insight embeddings, and chunk-level citation anchors.
- Retrieval eligibility: only rows where `content_items.status = 'ready'`.

## Canonical Contracts

- Item identity in app and events: `externalId`.
- Item classification: `contentType`.
- Source classification: provider-qualified `sourceType` values.
- Item uniqueness in `content_items`: `(library_id, content_type, external_id)`.

Current provider-qualified source types:

- `youtube_video`
- `youtube_playlist`
- `youtube_channel`

## Provider Abstraction

Provider code lives in `src/server/ingestion/providers/`.

- `types.ts` defines canonical provider contracts (`ContentDiscovery`, `ContentFetcher`, `ContentSegment`, `ContentAnchor`, `FetchedContent`).
- `registry.ts` resolves discovery/fetcher implementations by `sourceType`/`contentType`.
- `youtube.ts` contains YouTube-specific discovery and fetching.

All files in `src/server/**` are server-only.

## Pipeline Overview

1. User adds source via API.
2. API validates source URL and enqueues `source.added`.
3. `source-added` resolves provider discovery from registry, discovers items, upserts `content_items`, applies allowance gating, then enqueues `video.ingest`.
4. `video-ingest` resolves provider fetcher from registry and processes one item to `ready` or terminal `failed`.

## Source Planning (`source.added`)

- Function: `src/server/inngest/functions/source-added.ts`
- Concurrency: serialized per user (`limit: 1`, key `event.data.userId`) to prevent over-queue races.
- Discovery: provider `discover(url, sourceType)` returns normalized discovered items.
- Upsert strategy: idempotent upsert keyed by `(library_id, content_type, external_id)`.
- Queue eligibility: rows currently `pending` or `failed` can be re-queued.
- Billing-aware gating:
  - resolves monthly and lifetime remaining allowances from Polar customer state
  - queues only allowed count
  - marks overflow rows `failed` with provider-agnostic limit reasons

## Per-Item Processing (`video.ingest`)

- Function: `src/server/inngest/functions/video-ingest.ts`
- Concurrency: max 5 concurrent runs per user.
- Steps:
  1. Mark row `processing`.
  2. Fetch provider content using `contentType` + `externalId`.
  3. Chunk content segments with token-aware boundaries.
  4. Embed chunks and upsert `content_chunks`.
  5. Upsert chunk-level citation anchors to `content_chunk_anchors`.
  6. Generate insights and embed/upsert `content_insights`.
  7. Mark row `ready` and persist summary metadata.
  8. Emit `billing.usage.video.record`.
  9. Emit analytics event for ready completion.

## Idempotency and Data Guarantees

- `content_chunks` upsert target: `(content_item_id, chunk_index)`.
- `content_chunk_anchors` upsert target: `(content_chunk_id, anchor_key)`.
- `content_insights` upsert target: `(content_item_id, insight_type)`.
- Stale chunk/anchor/insight rows are deleted when a later run yields fewer records.
- Retries converge on latest provider-derived state, not duplicate rows.

## Failure Model

- Source and item functions retry up to configured attempts.
- Terminal classification is centralized in `classifyIngestionError`.
- Provider errors extend shared `IngestionError` with `terminal: boolean`.
- On terminal failure, row is marked `failed` and failure analytics is emitted.
- User-facing reasons are provider-agnostic. Technical details are captured in Sentry.

## UI Contract

- Item statuses are exposed via `GET /api/libraries/[libraryId]/videos` (route name retained for now).
- Status values: `pending`, `processing`, `ready`, `failed`.
- Counts and settled/in-flight flags drive sidebar polling and progress UI.
- Source refresh uses `POST /api/libraries/[libraryId]/sources/[sourceId]/retry` and reuses `source.added` planning.

## Key Invariants

- Never bypass Inngest for ingestion work.
- Never write embeddings directly from client code.
- Never include non-ready rows in retrieval.
- Keep all customer-facing errors provider-agnostic.
- Keep ingestion contracts forward-only. Remove obsolete code in the same PR.

## Key Entry Points

- `src/app/api/libraries/[libraryId]/sources/route.ts`
- `src/server/inngest/functions/source-added.ts`
- `src/server/inngest/functions/video-ingest.ts`
- `src/server/ingestion/providers/types.ts`
- `src/server/ingestion/providers/registry.ts`
- `src/server/ingestion/chunking.ts`
- `src/server/ingestion/ai.ts`

## Safe Change Checklist

When changing ingestion behavior:

1. Preserve idempotent upsert semantics.
2. Preserve per-user queue safety for `source.added`.
3. Preserve provider-agnostic user messaging.
4. Do not add compatibility aliases or fallback paths.
5. Verify `npm run typecheck`, `npm run lint`, and `npm run build`.
6. Update this file when contracts, step order, retries, limits, or statuses change.
