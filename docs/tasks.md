# Tasks

## MVP Features

### Core

- [x] User authentication (Supabase Auth - email + magic link)
- [x] Create, name, and delete Libraries
- [x] Set up `@tanstack/react-query` (QueryClient provider, devtools, standard query/mutation patterns)
- [x] Add a YouTube source to a Library (channel URL, playlist URL, or video URL)
- [x] Background ingestion via Inngest (transcript fetch + summary + embed)
- [ ] Ingestion progress visible in UI (pending / processing / ready / failed per video)
- [ ] Per-video summary + key insights display
- [ ] Library chat (RAG over all ready videos in the library)
- [ ] Compact source rollup with timestamp links in chat responses
- [ ] Chat history persisted per library
- [ ] Mobile-first responsive UI across app shell and feature pages

### Monetization

- [ ] Polar.sh subscription integration
- [ ] Plan enforcement: video ingestion limits, chat message limits
- [ ] Upgrade prompt when limits are hit
- [ ] Billing portal via Polar customer portal

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
- Resend for custom domain email delivery and branded templates
- Google OAuth (magic link only for MVP)
