# Plan: Source-Agnostic Ingestion Architecture

## Mål

Gå från en YouTube-hårdkodad kodbas till en som stödjer flera källtyper.
Inga nya källor implementeras i denna PR - bara abstraktionen som gör det möjligt.

---

## Principer

- Forward-only. Inga legacy-shims.
- Minimal ytyta som måste röras per ny källa framöver.
- `externalId` som universell identifierare för ett content item (var: `youtubeVideoId`).
- Plattformsspecifik logik kapslas in i providers.
- Befintlig pipeline (chunking → embedding → insights) rörs inte.

---

## Steg 1 - DB-schemamigration

**Fil:** `src/db/schema.ts` + genererad migration

- Döp om kolumn: `videos.youtube_video_id` → `videos.external_id`
- Uppdatera unique constraint: `(library_id, external_id)` (semantiken är identisk)
- Lägg till kolumn: `videos.content_type` enum `("youtube_video" | "article")` default `"youtube_video"`
  - Används för att avgöra vilken provider + länkformat som ska användas
  - `"youtube_video"` backfillas automatiskt av default-värdet på befintliga rader

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
  startSeconds: number | null   // null för icke-tidsbaserat innehåll
  endSeconds: number | null
  text: string
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
- `src/server/chat/types.ts` (1 plats i `ChatSourceVideo`)
- `src/server/chat/sources.ts`:
  - Importera och använd `contentType` för att avgöra länkformat
  - YouTube: `https://youtube.com/watch?v={externalId}&t={seconds}` (befintlig logik)
  - Article (framtida): `{externalId}` (URL direkt, inga timestamps)
  - Extrahera `buildItemUrl(externalId, contentType, seconds)` hjälpfunktion

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

- Beskrivning: "YouTube knowledge base SaaS" → "knowledge base SaaS" med YouTube som primär källa
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

Drizzle-migration genereras för:
1. `ALTER TABLE videos RENAME COLUMN youtube_video_id TO external_id`
2. `ALTER TABLE videos ADD COLUMN content_type text NOT NULL DEFAULT 'youtube_video'`
3. `DROP CONSTRAINT videos_library_video_uniq; ADD CONSTRAINT videos_library_external_uniq UNIQUE(library_id, external_id)`

Befintlig data kräver ingen manuell åtgärd - default-värdet på `content_type` sätter alla befintliga rader korrekt.

---

## Vad detta INTE inkluderar

- Implementation av artikel-källtyp (nästa PR)
- Uppdatering av landing page / marketing copy
- Ändring av `/api/libraries/[libraryId]/videos` route-namn
- Ändring av tabell-namnen `videos`, `video_chunks`, `video_insights`
- Billing event-semantik (fortfarande "video" i Polar)
