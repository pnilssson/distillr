# Distillr

Distillr is an AI-powered YouTube research tool. Users add YouTube channels, playlists, or individual videos and Distillr extracts the transcripts, processes them with AI, and turns them into a persistent, searchable knowledge base they can chat with and export from.

Built for independent analysts, researchers, and writers who use YouTube as a primary source. Where most tools handle one transcript at a time, Distillr lets you build libraries of sources, ask questions across all of them, and get cited answers with timestamp links back to the original video.

> **Note:** Distillr is no longer live.

## How It Works

1. **Add sources** - paste a YouTube video, playlist, or channel URL
2. **Automatic processing** - transcripts are extracted, chunked, embedded, and indexed via a durable async pipeline
3. **Chat with your library** - ask questions and get answers grounded in your sources, with citations and timestamp links
4. **Export insights** - export conversations as TXT, Markdown, or AI-generated PDF briefs

## Key Features

- **Hybrid search** - combines vector similarity search (pgvector) with PostgreSQL full-text search for retrieval
- **Source citations** - every answer references specific videos and timestamps
- **Auto-sync** - opt-in automatic syncing of playlists and channels to keep libraries up to date
- **Multiple AI models** - choose between speed and capability per request (GPT-5.4 Nano / Mini / Smart)
- **Smart exports** - AI-generated reader-ready briefs from chat sessions
- **Credit-based billing** - freemium model with Free, Builder ($9/mo), and Pro ($24/mo) tiers

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, Vercel AI SDK v6, TanStack Query |
| **Backend** | Next.js API Routes, Drizzle ORM, Supabase PostgreSQL, pgvector |
| **AI** | OpenAI GPT-5.4 family, text-embedding-3-small (1536-dim) |
| **Async jobs** | Inngest (ingestion pipeline, billing usage, auto-sync scheduling) |
| **Auth** | Supabase Auth (magic link) with Row-Level Security |
| **Billing** | Polar (subscriptions, metered usage, checkout) |
| **Hosting** | Vercel |
| **Monitoring** | Sentry, PostHog |
