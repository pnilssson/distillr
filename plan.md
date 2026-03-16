# Plan: Source-Agnostic Ingestion Architecture

## Goal

Move from a YouTube-coupled codebase to one that treats all content sources as equals.
No new sources are implemented in this PR - only the abstraction that makes it possible.

---

## Principles

- Forward-only. No legacy shims.
- Minimal surface area to touch when adding a new source in the future.
- `externalId` as the universal identifier for a content item (replaces `youtubeVideoId`).
- All source types are equal - no source is a default or primary.
- Platform-specific logic is encapsulated in providers.
- The existing pipeline (chunking → embedding → insights) is not touched.
- Chat sources are exposed at item level, not timestamp level.

---

## Existing Architecture Patterns (must be followed)

All new code must conform to the patterns already established in the codebase.

### `server-only`
Every file under `src/server/` starts with `import "server-only"`. All new provider files follow this without exception.

### Custom error classes
Provider errors use a custom class with a `terminal: boolean` property:
```typescript
export class SomeProviderError extends Error {
  readonly terminal: boolean
  constructor(message: string, terminal: boolean) {
    super(message)
    this.name = "SomeProviderError"
    this.terminal = terminal
  }
}
```
`terminal: true` means no retry is warranted (e.g. content not found, no transcript available).
`terminal: false` means the error may be transient and should retry.

### `classifyIngestionError` - central error classifier
`src/server/ingestion/errors.ts` is the single place that maps thrown errors to `IngestionErrorDecision` (`reason`, `retryable`, `captureException`). It currently does `instanceof` checks on `YouTubeDiscoveryError` and `TranscriptUnavailableError` directly - this is a coupling that must be resolved as part of this plan (see Step 2 below). After the refactor, all provider errors extend a shared `IngestionError` base class so `errors.ts` never needs updating when a new provider is added.

### Inngest step pattern
Each discrete unit of work in an Inngest function is wrapped in `step.run("step-name", async () => { ... })`. Steps that perform network I/O during ingestion use the `runIngestionStep` wrapper from `src/server/inngest/ingestion-step.ts` instead of raw `step.run`, as it applies ingestion-specific retry/error semantics:
```typescript
const result = await runIngestionStep(step, "fetch-content", async () => {
  return fetcher.fetch(externalId)
})
```

### Failure context pattern
Inngest functions declare a `failureContext` object upfront, then overwrite it with confirmed DB values after the load step. The catch block uses `failureContext` for all DB writes and analytics - never `event.data` directly. This pattern is already in both `source-added.ts` and `video-ingest.ts` and must be preserved.

### Drizzle query style
- All DB writes go through server boundaries (Route Handlers or Inngest functions).
- Upserts use `.onConflictDoUpdate` with `sql\`excluded.column_name\`` for all updated fields.
- Stale rows are cleaned up with a `.delete()` call after upserts (e.g. removing old chunks when a re-ingest produces fewer).
- Never hand-write migrations - define schema in `src/db/schema.ts`, generate via `npm run db:generate`.

### Analytics tracking
PostHog events are emitted inside `step.run()` calls at the end of the happy path, and in the catch block for failures. Event names and properties follow the snake_case convention defined in AGENTS.md.

---

## Step 1 - DB schema migration

**File:** `src/db/schema.ts` + generated migration

- Rename field: `youtubeVideoId` → `externalId` (Drizzle generates RENAME COLUMN)
- Add field: `contentType` as `.notNull()` with no default - database is wiped before migration runs
- Update unique index to `(libraryId, externalId)`

No other tables (`video_chunks`, `video_insights`) need schema changes - they are already source-agnostic.

Migrations are never hand-written. Schema changes are defined in `src/db/schema.ts` and the migration is generated via `npm run db:generate`.

---

## Step 2 - New provider abstraction

**New directory:** `src/server/ingestion/providers/`

### `src/server/ingestion/providers/types.ts`

```typescript
export type ContentType = "youtube_video" | "article"

export type DiscoveredItem = {
  externalId: string        // videoId for YouTube, URL for article
  contentType: ContentType
  title: string
  thumbnailUrl: string | null
  authorName: string | null  // replaces channelName
  authorId: string | null    // replaces channelId
  publishedAt: Date | null
  durationSeconds: number | null
}

export type DiscoveryResult = {
  items: DiscoveredItem[]
  sourceAuthorName: string | null
  sourceTitle: string | null
}

export type ContentSegment = {
  startSeconds: number | null   // null for non-time-based content (e.g. articles)
  endSeconds: number | null
  text: string
  // startSeconds/endSeconds are used internally for chunk boundaries only,
  // never exposed in chat sources
}

export type FetchedContent = {
  title: string | null
  segments: ContentSegment[]
}

export interface ContentDiscovery {
  discover(url: string, sourceType: string): Promise<DiscoveryResult>
}

export interface ContentFetcher {
  fetch(externalId: string): Promise<FetchedContent>
}
```

### `src/server/ingestion/providers/types.ts` - shared base error

Add a base error class that all provider errors extend:
```typescript
export class IngestionError extends Error {
  readonly terminal: boolean
  constructor(message: string, terminal: boolean) {
    super(message)
    this.name = "IngestionError"
    this.terminal = terminal
  }
}
```

### `src/server/ingestion/providers/youtube.ts`

- Move all logic from `youtube-discovery.ts` (discovery) and `transcript.ts` (fetching) here
- `YouTubeDiscoveryError` and `TranscriptUnavailableError` both extend `IngestionError` instead of `Error`
- Export `youtubeDiscovery: ContentDiscovery` and `youtubeFetcher: ContentFetcher`
- Delete `youtube-discovery.ts` and `transcript.ts`

### `src/server/ingestion/providers/registry.ts`

```typescript
export function getDiscovery(sourceType: string): ContentDiscovery
export function getFetcher(contentType: ContentType): ContentFetcher
```

Maps sourceType → discovery instance and contentType → fetcher instance.

### `src/server/ingestion/errors.ts`

Update `classifyIngestionError` to check `instanceof IngestionError` instead of the two
YouTube-specific error classes. This is what decouples the error classifier from providers:
```typescript
if (error instanceof IngestionError) {
  return {
    reason: normalizeFailureReason(error.message),
    retryable: !error.terminal,
    captureException: !error.terminal,
  }
}
```
Remove imports of `YouTubeDiscoveryError` and `TranscriptUnavailableError`.

---

## Step 3 - Update validation layer

**File:** `src/lib/validation/sources.ts`

- Remove `YouTubeSourceType`
- Rename `ParsedYouTubeUrl` → `ParsedSourceUrl`
- Rename `parseYouTubeUrl` → `parseSourceUrl`
  - Returns `{ platform: "youtube"; type: "video"|"playlist"|"channel"; sourceKey: string } | null`
  - Article platform added in the next PR
- Validation error message stays as-is until articles are added

---

## Step 4 - Update Inngest functions

### `src/server/inngest/functions/source-added.ts`

- Replace `discoverVideosFromSource` + `YouTubeSourceType` imports with `getDiscovery` from registry
- Replace `youtubeVideoId` with `externalId` in all upserts and events
- Add `contentType` to upserted item rows
- Add `contentType` to `video.ingest` event payload

### `src/server/inngest/functions/video-ingest.ts`

- Replace `fetchTranscript` import with `getFetcher(contentType)` from registry
- Replace `youtubeVideoId` with `externalId` in DB selects and event data
- Replace `TranscriptSegment` with `ContentSegment` in chunking call

---

## Step 5 - Update chunking

**File:** `src/server/ingestion/chunking.ts`

- Replace `TranscriptSegment` import with `ContentSegment` from `providers/types`
- Rename exported type `TranscriptChunk` → `ContentChunk`
- Rename exported function `chunkTranscriptSegments` → `chunkContentSegments`
- `ContentChunk.startSeconds` and `ContentChunk.endSeconds` become `number | null` (currently required `number`)
  - Fallback: when a segment has `null` time values, treat as `0` for chunk boundary calculation - chunk boundaries are best-effort for non-time-based content
- Update `video-ingest.ts` to use `chunkContentSegments` and `ContentChunk`
- The upsert in `video-ingest.ts` already writes `startSeconds`/`endSeconds` to `video_chunks` - verify the DB schema columns allow null and update the upsert values accordingly

---

## Step 6 - Update chat/retrieval layer

Replace `youtubeVideoId` → `externalId` in:

- `src/server/chat/retrieval.ts` (4 locations)
- `src/server/chat/fusion.ts` (3 locations)
- `src/server/chat/types.ts`

### Simplified source rollup - remove all timestamp logic

**Current:** `ChatSourceVideo` holds a list of timestamps with YouTube `watch?v=X&t=Y` links per second. This is tightly coupled to YouTube.

**New design:** Sources are exposed at item level, not timestamp level.

`src/server/chat/types.ts`:
```typescript
// Removed: ChatSourceTimestamp, timestamps array in ChatSourceVideo

export type ChatSourceItem = {
  itemId: string
  externalId: string
  contentType: ContentType
  title: string
  url: string            // built from externalId + contentType at rollup time
  referenceCount: number // number of chunks referencing this item
}

export type ChatSourcesRollup = {
  items: ChatSourceItem[]   // sorted by referenceCount desc
}
```

`src/server/chat/sources.ts`:
- Remove `GroupedVideo`, `MAX_SOURCE_VIDEOS`, `MAX_TIMESTAMPS_PER_VIDEO`, `formatTimestampLabel`, and all timestamp logic
- New grouping: one `ChatSourceItem` per unique `videoId`, count how many evidence items reference it (`referenceCount`)
- Build `url` per item based on `contentType`:
  - `youtube_video`: `https://www.youtube.com/watch?v={externalId}`
  - `article`: `{externalId}` (externalId is the URL)
- Sort by `referenceCount` desc, tie-break by `videoId` for determinism (same pattern as current `bestScore` sort)
- Return all items - no slicing. Current `extraVideos` field is removed.
- `buildSourcesRollup` no longer accepts an `options` argument

Current return shape `{ videos: ChatSourceVideo[], extraVideos: number }` → new shape `{ items: ChatSourceItem[] }`.

`src/features/chat/` (UI):
- Show top 4-5 items, render a "Show all X sources" button when `items.length > 4`
- No per-source timestamp listing
- No change to how sources are passed from the server - the component reads `items`

`evidence_json` in `chat_messages` still stores full retrieval data (including chunk positions) for debugging - not exposed in the UI.

---

## Step 7 - Update server queries

- `src/server/sources/queries.ts`: `YouTubeSourceType` → `string`, `youtubeVideoId` → `externalId`
- `src/server/videos/queries.ts`: `youtubeVideoId` → `externalId` in select and return type
- `src/app/api/libraries/[libraryId]/videos/route.ts`: `youtubeVideoId` → `externalId` in response

---

## Step 8 - Update feature types and UI

### Types

- `src/features/videos/types.ts`: `youtubeVideoId` → `externalId`, add `contentType`
- `src/features/sources/types.ts`: no changes needed yet

### UI components

- `src/features/videos/VideoDetailsDialog.tsx`:
  - `getYoutubeVideoUrl` → `getItemUrl(externalId, contentType)`
  - Aria-label "Watch on YouTube" → conditional text based on `contentType`
- `src/features/sources/AddSourceDialog.tsx`:
  - Keep YouTube-specific text for now (updated when articles are added)

---

## Step 9 - Update docs and AGENTS.md

### `AGENTS.md`

- Remove `Transcript extraction: TranscriptAPI` from Locked Stack Choices - it is now a YouTube-specific implementation detail, not a global stack choice
- Update Retrieval Invariants: replace "video" with "content item" in descriptive text, table names unchanged
- Update Observability: `video_ready` → `item_ready`, `video_failed` → `item_failed`
- Add "Content Providers" section with rules for adding new providers

### `docs/product.md`

- Description: "YouTube knowledge base SaaS" → "multi-source knowledge base SaaS" - YouTube is one source among many
- Target Users: broaden from YouTube-specific framing
- Pricing: "videos ingested" → "items ingested"

### `docs/ingestion-architecture.md`

- Full rewrite to reflect the provider abstraction
- Document `ContentDiscovery` and `ContentFetcher` interfaces
- Update pipeline description with the provider step

---

## Files deleted

- `src/server/ingestion/youtube-discovery.ts` (replaced by `providers/youtube.ts`)
- `src/server/ingestion/transcript.ts` (replaced by `providers/youtube.ts`)

---

## Files not touched

- `src/server/ingestion/openai.ts`
- `src/server/ingestion/errors.ts`
- `src/server/chat/service.ts`
- `src/server/chat/openai.ts`
- `src/server/billing/`
- All `src/components/ui/` (invariant)
- All API routes except sources and videos

---

## Out of scope

- Article source type implementation (next PR)
- Landing page / marketing copy updates
- Renaming the `/api/libraries/[libraryId]/videos` route
- Renaming the `videos`, `video_chunks`, `video_insights` tables
- Billing event semantics (still "video" in Polar)
