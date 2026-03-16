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

### `src/server/ingestion/providers/youtube.ts`

- Move all logic from `youtube-discovery.ts` (discovery) and `transcript.ts` (fetching) here
- Export `youtubeDiscovery: ContentDiscovery` and `youtubeFetcher: ContentFetcher`
- Delete `youtube-discovery.ts` and `transcript.ts`

### `src/server/ingestion/providers/registry.ts`

```typescript
export function getDiscovery(sourceType: string): ContentDiscovery
export function getFetcher(contentType: ContentType): ContentFetcher
```

Maps sourceType → discovery instance and contentType → fetcher instance.

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
- Handle null `startSeconds`/`endSeconds` for non-time-based content

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
- Remove all timestamp logic
- Build `url` per item based on `contentType`:
  - `youtube_video`: `https://www.youtube.com/watch?v={externalId}`
  - `article`: `{externalId}` (externalId is the URL)
- Return all sources sorted by `referenceCount`
- Remove `MAX_SOURCES` constant - the UI layer handles truncation

`src/features/chat/` (UI):
- Show top 4-5 sources with a "Show all X sources" button to expand
- No per-source timestamp listing
- Frontend consumes `ChatSourcesRollup.items` and truncates at render time

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
