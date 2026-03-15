# Tasks

## MVP Features

### Core

- [x] User authentication (Supabase Auth - email + magic link)
- [x] Custom domain auth email delivery and branded templates
- [x] Create, name, and delete Libraries
- [x] Set up `@tanstack/react-query` (QueryClient provider, devtools, standard query/mutation patterns)
- [x] Add a YouTube source to a Library (channel URL, playlist URL, or video URL)
- [x] Background ingestion via Inngest (transcript fetch + summary + embed)
- [x] Ingestion progress visible in UI (pending / processing / ready / failed per video)
- [x] Library chat (RAG over all ready videos in the library)
- [x] Chat history persisted per library

### Monetization

- [x] Polar.sh subscription integration
- [x] Plan enforcement: video ingestion limits, chat credit limits
- [x] Upgrade prompt when limits are hit
- [x] Billing portal via Polar customer portal

---

# Intentionally Deferred (Post-MVP)

- Whisper fallback for videos without captions
- Cross-library search
- Team / shared libraries
- API access for developers
- Data export
- Topic export (semantic search over a keyword, export all matching clips)
- Notion / Obsidian push integration
- Auto-sync (watch a channel, ingest new videos automatically)
- Dark mode
- Chrome extension
- Google OAuth (magic link only for MVP)
