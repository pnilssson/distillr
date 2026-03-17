# Forward-Only Plan: Source-Agnostic Ingestion + Universal Anchors

## Why This Exists

We are pre-user and intentionally forward-only. We optimize for a clean target architecture, not backward compatibility.

Rules:

- no compatibility shims
- no dual-write paths
- no legacy aliases
- no backfills to preserve old rows

## What Is Already Done

The codebase already completed the source-agnostic foundation:

- provider-based ingestion (`src/server/ingestion/providers/*`)
- canonical item identity (`externalId`, `contentType`)
- provider-qualified source types (`youtube_video`, `youtube_playlist`, `youtube_channel`)
- item-level chat source rollup (`items[]`)
- strict forward-only cleanup of legacy YouTube-coupled contracts

This gives one shared retrieval pipeline after provider extraction.

## What We Are Adding Next

Introduce one universal anchor layer so source-specific citations work across all providers while keeping one shared RAG model.

Canonical new table:

- `content_chunk_anchors`

We are not introducing parallel pipelines (`texts`, `text_chunks`, `text_insights`).

## Architectural Decision

Keep one shared storage path for retrieval content:

- `content_items`
- `content_chunks`
- `content_insights`

Add one shared citation extension layer:

- `content_chunk_anchors`

Providers can emit source-specific anchors, but storage and chat contracts stay canonical.

## Canonical Anchor Contract

Add these types to `src/server/ingestion/providers/types.ts`:

```ts
export type ContentAnchorType = "timecode" | "page" | "section" | "char_range";

export type ContentAnchor = {
  anchorKey: string;
  anchorType: ContentAnchorType;
  startValue: number | null;
  endValue: number | null;
  label: string | null;
  urlFragment: string | null;
  metadata: Record<string, unknown> | null;
};

export type ContentSegment = {
  startSeconds: number | null;
  endSeconds: number | null;
  text: string;
  anchors: ContentAnchor[];
};
```

Notes:

- `anchorKey` is deterministic and used for upsert dedupe per chunk.
- `metadata` is for provider-specific long-tail fields only.

## Implementation Plan

### Step 0 - destructive preflight

Before rollout in any environment with stale rows:

- wipe ingestion-derived rows (`content_items`, `content_chunks`, `content_insights`)
- no backfill scripts are added

### Step 1 - schema: add `content_chunk_anchors`

Update `src/db/schema.ts` with a new table:

- `id` uuid pk
- `userId` uuid not null
- `libraryId` uuid not null
- `contentItemId` uuid fk -> `content_items.id`
- `contentChunkId` uuid fk -> `content_chunks.id`
- `anchorKey` text not null
- `anchorType` text not null
- `startValue` double precision null
- `endValue` double precision null
- `label` text null
- `urlFragment` text null
- `metadata` jsonb null
- `createdAt`, `updatedAt`

Indexes/constraints:

- unique `(contentChunkId, anchorKey)`
- index `(libraryId)`
- index `(videoId)`
- index `(chunkId)`
- index `(anchorType)`

Add RLS policies with the same user/library ownership pattern as other ingestion tables.

Generate/apply migration via:

- `npm run db:generate`
- `npm run db:migrate`

### Step 2 - provider output: YouTube emits anchors

Update `src/server/ingestion/providers/youtube.ts` so segments include timecode anchors:

- `anchorType: "timecode"`
- `anchorKey: "timecode:${Math.floor(startSeconds)}"`
- `label: "mm:ss"`
- `urlFragment: "t=<seconds>"`

### Step 3 - chunking propagation

Update `src/server/ingestion/chunking.ts`:

- preserve segment-to-chunk grouping boundaries
- aggregate/dedupe anchors from covered segments into each output chunk
- keep `startSeconds/endSeconds` as coarse chunk bounds only

### Step 4 - ingestion write path

Update `src/server/inngest/functions/video-ingest.ts`:

- upsert chunk rows as today
- upsert chunk anchors into `content_chunk_anchors`
- conflict target: `(contentChunkId, anchorKey)`
- delete stale anchors for removed/changed chunks in same run

### Step 5 - retrieval and rollup contract

Update:

- `src/server/chat/types.ts`
- `src/server/chat/sources.ts`
- `src/server/chat/service.ts`
- `src/server/chat/queries.ts`

New contract shape:

```ts
type ChatSourceAnchor = {
  anchorType: "timecode" | "page" | "section" | "char_range";
  label: string | null;
  url: string;
};

type ChatSourceItem = {
  itemId: string;
  externalId: string;
  contentType: ContentType;
  title: string;
  url: string;
  referenceCount: number;
  anchors: ChatSourceAnchor[];
};
```

Rules:

- item-level rollup remains canonical
- anchors are optional and additive
- no legacy timestamp-array contract is restored

### Step 6 - URL builder centralization

Add a single URL helper (shared server/client):

- `buildItemUrl(externalId, contentType)`
- `buildAnchorUrl(externalId, contentType, urlFragment)`

No provider-specific URL logic in chat UI components.

### Step 7 - UI rendering

Update:

- `src/features/chat/types.ts`
- `src/features/chat/ChatSources.tsx`

Render item links with optional anchor links:

- timecode links for YouTube now
- page/section/char-range links for future providers

## Acceptance Criteria

1. `content_chunk_anchors` is the canonical citation-anchor table.
2. YouTube ingestion writes timecode anchors into `content_chunk_anchors`.
3. Chat source rollup remains item-level and can include optional anchors.
4. No compatibility aliases, dual payloads, or backfill code paths are added.
5. `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Verification

```bash
npm run db:generate
npm run db:migrate
npm run typecheck
npm run lint
npm run build
```

## Out of Scope

- Implementing non-YouTube providers
- Reworking billing product semantics in this refactor
