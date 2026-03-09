# Tasks

## MVP Features

### Core

- [x] User authentication (Supabase Auth - email + magic link)
- [ ] Create, name, and delete Libraries
- [ ] Add a YouTube source to a Library (channel URL, playlist URL, or video URL)
- [ ] Background ingestion via Inngest (transcript fetch + summary + embed)
- [ ] Ingestion progress visible in UI (pending / processing / ready / failed per video)
- [ ] Per-video summary + key insights display
- [ ] Library chat (RAG over all ready videos in the library)
- [ ] Timestamp-linked citations in chat responses
- [ ] Chat history persisted per library
- [ ] Mobile-first responsive UI (bottom nav on mobile, sidebar on desktop)

### Export

- [ ] Export: Summary pack (all video summaries as Markdown or PDF)
- [ ] Export: Raw transcript (TXT, per video or full library)
- [ ] Export: Chat session (Markdown)

### Monetization

- [ ] Polar.sh subscription integration
- [ ] Plan enforcement: video ingestion limits, chat message limits
- [ ] Upgrade prompt when limits are hit
- [ ] Billing portal via Polar customer portal

---

## Open Questions (resolve before or during build)

- [ ] Domain name - distillr.io / distillr.app / getdistillr.com - check availability
- [ ] TranscriptAPI.com plan tier - check pricing for expected MVP volume
- [ ] Auth flow - magic link only for MVP, or add Google OAuth from day one?
- [ ] Free plan video limit - 15 might be too low to demonstrate cross-video value; consider 25
- [ ] Inngest plan - free tier supports enough for early MVP, check concurrency limits

# Intentionally Deferred (Post-MVP)

- Whisper fallback for videos without captions
- Cross-library search
- Team / shared libraries
- API access for developers
- Topic export (semantic search over a keyword, export all matching clips)
- Notion / Obsidian push integration
- Auto-sync (watch a channel, ingest new videos automatically)
- Dark mode
- Chrome extension
- Resend for custom domain email delivery and branded templates
- Google OAuth (magic link only for MVP)
