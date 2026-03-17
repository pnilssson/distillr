# Forward-Only Plan: Source-Agnostic Ingestion Foundation

## Goal

Refactor the ingestion and retrieval contracts so the codebase is source-agnostic by design, while still supporting only YouTube in this PR.

This plan is intentionally forward-only:

- no compatibility shims
- no dual-write paths
- no legacy fallback logic
- no data migrations to preserve old rows

We currently have no users, so we prioritize a clean target architecture over compatibility.

## What This Plan Changes

- Replace YouTube-coupled identifiers (`youtubeVideoId`) with provider-neutral identifiers (`externalId`).
- Introduce provider interfaces and a provider registry for discovery and content fetching.
- Make ingestion and chat source rollups item-based, not YouTube-timestamp based.
- Keep existing retrieval tables (`videos`, `video_chunks`, `video_insights`) for now, but make their row contracts source-agnostic.

## What This Plan Does Not Do

- No new non-YouTube provider implementation in this PR.
- No landing page or positioning rewrite in this PR.
- No compatibility layers for old schema, old events, or old payload shapes.

## Forward-Only Rules For This Refactor

1. Remove obsolete code paths immediately after replacement.
2. Rename contracts directly instead of aliasing old and new names.
3. If schema changes break old rows, wipe ingestion-related data before rollout.
4. Keep only one canonical interface per concern.

## Target Architecture

### 1) Canonical identity model

- Content item identity in app code: `externalId`.
- Content classification in app code: `contentType`.
- DB uniqueness for items: `(library_id, content_type, external_id)`.

### 2) Source type model

Do not use generic `"video" | "playlist" | "channel"` as global source types.

Use provider-qualified values so new providers do not collide:

- `youtube_video`
- `youtube_playlist`
- `youtube_channel`

### 3) Provider contract

Create `src/server/ingestion/providers/` with:

- `types.ts`
- `registry.ts`
- `youtube.ts`

Core interfaces:

```ts
export type ContentType = "youtube_video";

export type SourceType = "youtube_video" | "youtube_playlist" | "youtube_channel";

export type DiscoveredItem = {
  externalId: string;
  contentType: ContentType;
  title: string;
  thumbnailUrl: string | null;
  authorName: string | null;
  authorId: string | null;
  publishedAt: Date | null;
  durationSeconds: number | null;
};

export type DiscoveryResult = {
  items: DiscoveredItem[];
  sourceAuthorName: string | null;
  sourceTitle: string | null;
};

export type ContentSegment = {
  startSeconds: number | null;
  endSeconds: number | null;
  text: string;
};

export type FetchedContent = {
  title: string | null;
  segments: ContentSegment[];
  raw: unknown;
};

export interface ContentDiscovery {
  discover(url: string, sourceType: SourceType): Promise<DiscoveryResult>;
}

export interface ContentFetcher {
  fetch(externalId: string): Promise<FetchedContent>;
}
```

Note: keep `ContentType` as `"youtube_video"` for now. Add new members only when a provider is implemented.

### 4) Shared ingestion error base class

Provider errors must extend one shared error:

```ts
export class IngestionError extends Error {
  readonly terminal: boolean;

  constructor(message: string, terminal: boolean) {
    super(message);
    this.name = "IngestionError";
    this.terminal = terminal;
  }
}
```

`classifyIngestionError` must depend only on `IngestionError`, not provider-specific classes.

### 5) Item-level source rollup

Chat source rollups must not include YouTube timestamp links.

Use one source item per content item:

```ts
export type ChatSourceItem = {
  itemId: string;
  externalId: string;
  contentType: ContentType;
  title: string;
  url: string;
  referenceCount: number;
};

export type ChatSourcesRollup = {
  items: ChatSourceItem[];
};
```

## Implementation Plan

### Step 0 - destructive preflight (required)

Before applying schema and contract changes:

- wipe ingestion-derived data (`videos`, `video_chunks`, `video_insights`) in every environment before rollout
- remove any obsolete local/dev data that uses old contracts

No backfill scripts are added.

### Step 1 - schema and DB contract

Update `src/db/schema.ts`:

- rename `videos.youtubeVideoId` -> `videos.externalId`
- add `videos.contentType` as `.notNull()` with no default
- replace unique key with `(libraryId, contentType, externalId)`
- make `video_chunks.startSeconds` and `video_chunks.endSeconds` nullable now

Generate migration with `npm run db:generate`.

### Step 2 - provider module refactor

- Add `src/server/ingestion/providers/types.ts`.
- Add `src/server/ingestion/providers/registry.ts`.
- Add `src/server/ingestion/providers/youtube.ts` by moving logic from:
  - `src/server/ingestion/youtube-discovery.ts`
  - `src/server/ingestion/transcript.ts`
- Delete the two legacy files after replacement.

### Step 3 - validation and source typing

Update `src/lib/validation/sources.ts`:

- `parseYouTubeUrl` -> `parseSourceUrl`
- `ParsedYouTubeUrl` -> `ParsedSourceUrl`
- return provider-qualified `SourceType` values
- keep current user-facing validation text YouTube-specific for now

### Step 4 - update Inngest ingestion functions

Update `src/server/inngest/functions/source-added.ts`:

- use `getDiscovery(sourceType)`
- write `externalId` and `contentType`
- dedupe by `(contentType, externalId)`
- include `contentType` in `video.ingest` event payload

Update `src/server/inngest/functions/video-ingest.ts`:

- load `externalId` and `contentType`
- use `getFetcher(contentType)`
- use content chunks from provider fetcher
- replace transcript-specific names with content-specific names

Update `src/server/inngest/client.ts` event schemas accordingly.

### Step 5 - chunking contract

Update `src/server/ingestion/chunking.ts`:

- `TranscriptSegment` -> `ContentSegment`
- `TranscriptChunk` -> `ContentChunk`
- `chunkTranscriptSegments` -> `chunkContentSegments`
- preserve token-window behavior
- support nullable start/end seconds in chunk outputs

### Step 6 - retrieval, fusion, and chat persistence

Update these files to use `externalId` and item-level source rollup:

- `src/server/chat/types.ts`
- `src/server/chat/retrieval.ts`
- `src/server/chat/fusion.ts`
- `src/server/chat/sources.ts`
- `src/server/chat/service.ts`
- `src/server/chat/queries.ts`

Key changes:

- remove timestamp-array source output
- return `{ items: ChatSourceItem[] }`
- build item URL from `contentType`
- keep `evidence_json` intact for debugging

### Step 7 - API and feature type propagation

Update server and client contracts:

- `src/server/videos/queries.ts`
- `src/app/api/libraries/[libraryId]/videos/route.ts`
- `src/features/videos/types.ts`
- `src/features/videos/VideoDetailsDialog.tsx`
- `src/features/chat/types.ts`
- `src/features/chat/ChatSources.tsx`

Update source typing usage where needed:

- `src/server/sources/queries.ts`
- `src/app/api/libraries/[libraryId]/sources/route.ts`
- `src/features/sources/types.ts`
- source UI components that switch on source type

### Step 8 - delete obsolete contracts and files

Required cleanup in same PR:

- remove remaining `youtubeVideoId` references
- remove old transcript-specific ingestion types
- delete replaced ingestion files
- remove dead timestamp rollup helpers

No deprecated aliases are kept.

## Files That Must Be Included (minimum)

- `src/db/schema.ts`
- `src/lib/validation/sources.ts`
- `src/server/ingestion/errors.ts`
- `src/server/ingestion/chunking.ts`
- `src/server/ingestion/providers/types.ts` (new)
- `src/server/ingestion/providers/registry.ts` (new)
- `src/server/ingestion/providers/youtube.ts` (new)
- `src/server/inngest/client.ts`
- `src/server/inngest/functions/source-added.ts`
- `src/server/inngest/functions/video-ingest.ts`
- `src/server/chat/types.ts`
- `src/server/chat/retrieval.ts`
- `src/server/chat/fusion.ts`
- `src/server/chat/sources.ts`
- `src/server/chat/service.ts`
- `src/server/chat/queries.ts`
- `src/server/videos/queries.ts`
- `src/app/api/libraries/[libraryId]/videos/route.ts`
- `src/features/videos/types.ts`
- `src/features/videos/VideoDetailsDialog.tsx`
- `src/features/chat/types.ts`
- `src/features/chat/ChatSources.tsx`

## Documentation Updates Required In Same PR

- `docs/ingestion-architecture.md` (provider architecture and new contracts)
- `docs/chat-architecture.md` (item-level source rollup)
- `AGENTS.md` only if invariant wording changes in this refactor

## Acceptance Criteria

1. No runtime usage of `youtubeVideoId` remains in `src/**`.
2. `classifyIngestionError` has no provider-specific imports.
3. Ingestion works end-to-end for YouTube with provider registry wiring.
4. Chat sources render item-level citations without timestamp lists.
5. DB uniqueness uses `(libraryId, contentType, externalId)`.
6. No compatibility code paths or legacy aliases exist.

## Verification

Run after implementation:

```bash
npm run db:generate
npm run typecheck
npm run lint
npm run build
rg "youtubeVideoId|TranscriptSegment|ChatSourceTimestamp|extraVideos" src
```

## Out of Scope

- Implementing non-YouTube providers
- Renaming `videos`, `video_chunks`, `video_insights` tables
- Reworking billing product semantics in this refactor
