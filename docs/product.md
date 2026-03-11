# What is Distillr?

Distillr is a **YouTube knowledge base SaaS**. Users add YouTube channels, playlists, or individual videos and Distillr extracts the transcripts, processes them with AI, and turns them into a persistent, searchable knowledge base they can chat with and export from.

The mental model: **not a transcript downloader. A second brain for video content.**

Where competitors like Transcribr focus on extraction and file export, Distillr focuses on long-term knowledge accumulation. Users build Libraries over time, ask cross-video questions, and export structured knowledge - not raw transcripts.

---

# The Problem We Solve

YouTube is one of the richest knowledge sources on the internet, but it is fundamentally unsearchable and non-persistent. Watching 200 hours of content on a topic leaves you with no artifact. Nothing you can query, reference, or build on.

Distillr turns video content into something durable: a personal knowledge base that understands what was said across hundreds of videos, can answer questions with compact timestamp-linked sources, and lets you export structured insights into your own tools.

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
- **Timestamp-linked sources** - every AI answer includes a compact source rollup with links to exact moments in source videos
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

## Cost Basis (approximate, March 2026)

- Transcript fetch: ~€0.005-0.017 per video (TranscriptAPI, volume dependent)
- Embedding: ~€0.0001-0.0003 per video (OpenAI `text-embedding-3-small`)
- Insight generation: ~€0.003-0.013 per video (OpenAI `gpt-4.1-mini`, transcript length dependent)
- Total ingestion cost: ~€0.008-0.030 per video (transcript + embedding + insights)
- Chat message: ~€0.012-0.028 per message (OpenAI `gpt-4.1`, context and answer length dependent)
- Polar fees: base 4% + €0.40 per transaction, with +1.5% for international cards and +0.5% for subscriptions where applicable
