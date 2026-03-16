# Plan: Source-Agnostic Ingestion Architecture

## Mål

Gå från en YouTube-hårdkodad kodbas till en som stödjer flera källtyper likvärdigt.
Inga nya källor implementeras i denna PR - bara abstraktionen som gör det möjligt.

---

## Principer

- Forward-only. Inga legacy-shims.
- Minimal ytyta som måste röras per ny källa framöver.
- `externalId` som universell identifierare för ett content item (var: `youtubeVideoId`).
- Alla källtyper är lika värda - ingen källa är "default" eller "primär".
- Plattformsspecifik logik kapslas in i providers.
- Befintlig pipeline (chunking → embedding → insights) rörs inte.
- Chat-sources exponerar källreferenser på item-nivå, inte tidsstämpelnivå.

---

## Steg 1 - DB-schemamigration

**Fil:** `src/db/schema.ts` + genererad migration

- Döp om kolumn: `videos.youtube_video_id` → `videos.external_id`
- Uppdatera unique constraint: `(library_id, external_id)` (semantiken är identisk)
- Lägg till kolumn: `videos.content_type` text NOT NULL
  - Används för att avgöra vilken provider + länkformat som ska användas
  - Migrationen backfylls med `UPDATE videos SET content_type = 'youtube_video'` innan NOT NULL sätts
  - Applikationskoden sätter alltid `content_type` explicit vid ingest - inget DB-default

Inga övriga tabeller (video_chunks, video_insights) behöver schema-ändring - de är redan källagnostiska.

---

## Steg 2 - Ny provider-abstraktion

**Ny katalog:** `src/server/ingestion/providers/`

### `src/server/ingestion/providers/types.ts`

```typescript
export type ContentType = "youtube_video" | "article"

export type DiscoveredItem = {
  externalId: string        // videoId för YouTube, URL för artikel
  contentType: ContentType
  title: string
  thumbnailUrl: string | null
  authorName: string | null  // channelName → authorName
  authorId: string | null    // channelId → authorId
  publishedAt: Date | null
  durationSeconds: number | null
}

export type DiscoveryResult = {
  items: DiscoveredItem[]
  sourceAuthorName: string | null
  sourceTitle: string | null
}

export type ContentSegment = {
  startSeconds: number | null   // null för icke-tidsbaserat innehåll (t.ex. artikel)
  endSeconds: number | null
  text: string
  // Obs: startSeconds/endSeconds används bara internt för chunking-gränser,
  // de exponeras aldrig i chat-sources mot användaren
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

- Flytta allt från `youtube-discovery.ts` hit (discovery-delen)
- Flytta all logik från `transcript.ts` hit (fetch-delen)
- Exportera `youtubeDiscovery: ContentDiscovery` och `youtubeFetcher: ContentFetcher`
- `youtube-discovery.ts` och `transcript.ts` raderas

### `src/server/ingestion/providers/registry.ts`

```typescript
export function getDiscovery(sourceType: string): ContentDiscovery
export function getFetcher(contentType: ContentType): ContentFetcher
```

Mappar sourceType → discovery-instans och contentType → fetcher-instans.

---

## Steg 3 - Uppdatera valideringsskiktet

**Fil:** `src/lib/validation/sources.ts`

- Byt namn: `YouTubeSourceType` → ta bort, ersätt med intern typ per plattform
- Byt namn: `ParsedYouTubeUrl` → `ParsedSourceUrl`
- Byt namn: `parseYouTubeUrl` → `parseSourceUrl`
  - Returnerar `{ platform: "youtube"; type: "video"|"playlist"|"channel"; sourceKey: string } | { platform: "article"; type: "article"; sourceKey: string } | null`
- Uppdatera `addSourceSchema` zod-valideringen att acceptera YouTube-URL:er (befintligt) - artiklar läggs till i nästa PR
- Felmeddelande: "Must be a valid YouTube video, playlist, or channel URL." → behålls för nu, uppdateras när artiklar läggs till

---

## Steg 4 - Uppdatera Inngest-funktioner

### `src/server/inngest/functions/source-added.ts`

- Ersätt import av `discoverVideosFromSource` + `YouTubeSourceType` med `getDiscovery` från registry
- Ersätt `youtubeVideoId` i alla upsert/events med `externalId`
- Lägg till `contentType` i upserted video-rader
- Event-payload `video.ingest` lägger till `contentType` fält

### `src/server/inngest/functions/video-ingest.ts`

- Ersätt import av `fetchTranscript` med `getFetcher(contentType)` från registry
- Ersätt `youtubeVideoId` med `externalId` i DB-select och event-data
- `ContentSegment` (ny generisk typ) ersätter `TranscriptSegment` i chunking-anropet

---

## Steg 5 - Uppdatera chunking

**Fil:** `src/server/ingestion/chunking.ts`

- Byt ut `TranscriptSegment` import mot `ContentSegment` från providers/types
- Null-hantering för `startSeconds`/`endSeconds` (artiklar har ingen tidsstämpel)

---

## Steg 6 - Uppdatera chat/retrieval-skiktet

Alla `youtubeVideoId` → `externalId` i:

- `src/server/chat/retrieval.ts` (4 platser)
- `src/server/chat/fusion.ts` (3 platser)
- `src/server/chat/types.ts`

### Förenkling av source-rollup (bryter ut tidsstämpellogiken helt)

**Nuläge:** `ChatSourceVideo` innehåller en lista av tidsstämplar (`timestamps`) med
YouTube-länkade `watch?v=X&t=Y` per sekund. Detta är hårt knutet till YouTube.

**Ny design:** Sources exponeras på item-nivå, inte tidsstämpelnivå.

`src/server/chat/types.ts`:
```typescript
// Tas bort:
// ChatSourceTimestamp, timestamps-array i ChatSourceVideo

export type ChatSourceItem = {
  itemId: string
  externalId: string
  contentType: ContentType
  title: string
  url: string            // externalId → URL, per contentType (byggs vid rollup)
  referenceCount: number // hur många chunks som refererar till detta item
}

export type ChatSourcesRollup = {
  items: ChatSourceItem[]   // sorterade efter referenceCount, desc
}
```

`src/server/chat/sources.ts`:
- Ta bort all tidsstämpellogik
- Bygg `url` per item baserat på `contentType`:
  - `youtube_video`: `https://www.youtube.com/watch?v={externalId}`
  - `article`: `{externalId}` (externalId är URL:en)
- Returnera alla sources sorterade efter `referenceCount`
- MAX_SOURCES-konstant tas bort - returnera alla, UI-skiktet hanterar "visa mer"

`src/features/chat/` (UI):
- Visa topp 4-5 sources med "Visa alla X källor"-knapp för att expandera
- Ingen timestamp-listning per källa
- Frontenden konsumerar `ChatSourcesRollup.items` och trunkerar vid rendering

**Konsekvens:** `evidence_json` i `chat_messages` lagras fortfarande med full retrieval-data
(inklusive chunk-positioner) för debugging - men exponeras inte i UI.

---

## Steg 7 - Uppdatera server queries

- `src/server/sources/queries.ts`: `YouTubeSourceType` → `string`, `youtubeVideoId` → `externalId`
- `src/server/videos/queries.ts`: `youtubeVideoId` → `externalId` i select + return-typ
- `src/app/api/libraries/[libraryId]/videos/route.ts`: `youtubeVideoId` → `externalId` i response

---

## Steg 8 - Uppdatera feature-typer och UI

### Typer

- `src/features/videos/types.ts`: `youtubeVideoId` → `externalId`, lägg till `contentType`
- `src/features/sources/types.ts`: `sourceType` behåller `"video"|"playlist"|"channel"` - inga ändringar behövs här ännu

### UI-komponenter

- `src/features/videos/VideoDetailsDialog.tsx`:
  - `getYoutubeVideoUrl` → `getItemUrl(externalId, contentType)`
  - Aria-label "Watch on YouTube" → konditionell text baserat på `contentType`
- `src/features/sources/AddSourceDialog.tsx`:
  - Behåller YouTube-text för nu (artiklar är nästa PR)

---

## Steg 9 - Uppdatera docs och AGENTS.md

### `AGENTS.md`

- "Locked Stack Choices" → ta bort `Transcript extraction: TranscriptAPI` som låst val (det är nu en YouTube-specifik implementation, inte en global stack-låsning)
- "Retrieval Invariants" → uppdatera "Retrieve from two layers: `video_chunks` and `video_insights`" → byt ut "video" med "content item" i texten, men behåll tabellnamn
- "Observability" → `video_ready` → `item_ready`, `video_failed` → `item_failed` (analytics events)
- Lägg till ny sektion "Content Providers" med regler för hur nya providers läggs till

### `docs/product.md`

- Beskrivning: "YouTube knowledge base SaaS" → "multi-source knowledge base SaaS" - YouTube är en källa bland flera, inte ett primärt fokus
- Target Users: bredda från YouTube-specifik formulering
- Pricing: "videos ingested" → "items ingested" i tabellerna

### `docs/ingestion-architecture.md`

- Komplett omskrivning för att reflektera provider-abstraktionen
- Dokumentera `ContentDiscovery` och `ContentFetcher` interfaces
- Uppdatera pipeline-diagram med provider-steget

---

## Filer som raderas

- `src/server/ingestion/youtube-discovery.ts` (ersätts av `providers/youtube.ts`)
- `src/server/ingestion/transcript.ts` (ersätts av `providers/youtube.ts`)

---

## Filer som inte rörs

- `src/server/ingestion/chunking.ts` - minimal ändring (TypeScript-typer)
- `src/server/ingestion/openai.ts` - ingen ändring
- `src/server/ingestion/errors.ts` - ingen ändring
- `src/server/chat/service.ts` - ingen ändring
- `src/server/chat/openai.ts` - ingen ändring
- `src/server/billing/` - ingen ändring
- All `src/components/ui/` - ingen ändring (invariant)
- API-routes förutom sources och videos - ingen ändring

---

## DB-migrationsplan

Inga migrationer skrivs för hand. Schemaändringar definieras i `src/db/schema.ts` och migration genereras via `npm run db:generate`.

Schemaändringar:
- Döp om fält: `youtubeVideoId` → `externalId` (Drizzle genererar RENAME COLUMN)
- Lägg till fält: `contentType` som `.notNull()` utan default - databasen töms innan migration körs
- Uppdatera unique index till `(libraryId, externalId)`

---

## Vad detta INTE inkluderar

- Implementation av artikel-källtyp (nästa PR)
- Uppdatering av landing page / marketing copy
- Ändring av `/api/libraries/[libraryId]/videos` route-namn
- Ändring av tabell-namnen `videos`, `video_chunks`, `video_insights`
- Billing event-semantik (fortfarande "video" i Polar)
