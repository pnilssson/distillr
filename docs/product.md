# What is Distillr?

Distillr is a **YouTube knowledge base SaaS**. Users add YouTube channels, playlists, or individual videos and Distillr extracts the transcripts, processes them with AI, and turns them into a persistent, searchable knowledge base they can chat with and export from.

The mental model: **not a transcript downloader. A second brain for video content.**

Where competitors like Transcribr focus on extraction and file export, Distillr focuses on long-term knowledge accumulation. Users build Libraries over time, ask cross-video questions, and export structured knowledge - not raw transcripts.

---

# The Problem We Solve

YouTube is one of the richest knowledge sources on the internet, but it is fundamentally unsearchable and non-persistent. Watching 200 hours of content on a topic leaves you with no artifact. Nothing you can query, reference, or build on.

Distillr turns video content into something durable: a personal knowledge base that understands what was said across hundreds of videos, can answer questions with timestamp citations, and lets you export structured insights into your own tools.

---

# How It Differs from Transcribr

> Transcribr is a file tool. Distillr is a knowledge tool.

|              | Transcribr               | Distillr                        |
| ------------ | ------------------------ | ------------------------------- |
| Core product | Bulk transcript download | Persistent knowledge library    |
| Organization | None                     | Named Libraries                 |
| Chat scope   | Current batch            | Entire library, cross-video     |
| Persistence  | Session-based            | Permanent, grows over time      |
| Export       | Raw transcript files     | Structured knowledge artifacts  |
| Target user  | Developers, power users  | Researchers, creators, learners |

Key differentiators:

- **Libraries as the primary object** - users curate named collections over time, not one-off queries
- **Cross-video semantic search** - ask questions across hundreds of videos simultaneously via RAG
- **Timestamp-linked citations** - every AI answer links back to the exact moment in the source video
- **Knowledge exports** - export summaries, topic reports, and chat sessions, not raw transcripts

---

# Target Users (MVP)

- **Researchers and analysts** building a knowledge base from expert channels in their field
- **Content creators** mining competitors or inspirational channels for patterns and ideas
- **Lifelong learners** who follow a set of channels and want to actually retain what they watch
- **Consultants and writers** who need to reference and cite what thought leaders have said on a topic

---

# Pricing Model

## Plans

| Plan        | Price  | Videos   | Chat messages/mo | Export                            |
| ----------- | ------ | -------- | ---------------- | --------------------------------- |
| **Free**    | €0     | 15 total | 50               | TXT only                          |
| **Builder** | €14/mo | 300      | 500              | All formats                       |
| **Pro**     | €34/mo | 1,500    | 2,000            | All formats + priority processing |

## Principles

- **Videos ingested** is the primary monetization lever - easy to understand, tied to real cost
- **Chat messages** are metered, not unlimited - LLM cost is real and scales with usage
- **Token guard:** internally track token spend per user; adjust context window for heavy users without changing visible limits
- **Overages:** when Builder/Pro users hit chat limit, offer a top-up (500 messages for €5 via Polar) rather than hard-blocking - converts frustration into revenue
- **Free plan** is generous enough to demonstrate value, tight enough to convert

---

# Dashboard

The dashboard (`/dashboard`) is the authenticated home screen. It is the first page a user sees after login and serves as the central overview of their Distillr activity.

## Current state

A minimal landing page. New users see the onboarding empty state (library icon, headline, use-case chips, "New library" CTA). Users with existing libraries see a blank page — future content will go here.

## Planned content

- **Usage stats** — videos ingested this billing period, chat messages used, remaining quota vs. plan limits
- **Plan indicator** — current plan tier with a contextual upgrade prompt when limits are approaching
- **Recent activity** — latest chat sessions across all libraries (title, library name, timestamp)
- **Recently added sources** — last N sources added, with ingestion status (pending / processing / ready / failed)
- **Quick-access library list** — all libraries with video count and last-active timestamp, sorted by recency

## Design intent

Calm overview. One glance should tell the user where they left off and how much of their plan they have used. No busy analytics grids — just the information that is directly actionable.

---

## Cost Basis (approximate)

- Transcript fetch: ~€0.005-0.01 per video (TranscriptAPI.com)
- Embedding: ~€0.002 per video (OpenAI)
- Summary generation: ~€0.002-0.005 per video (Claude Haiku)
- Chat message: ~€0.005-0.02 per message (Claude Sonnet, depending on context)
- Polar fee: 4% + €0.40 per transaction (MoR, includes EU VAT handling)

