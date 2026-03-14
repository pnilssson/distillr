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

| Plan        | Price  | Monthly videos | Total video cap | Monthly credits |
| ----------- | ------ | -------------- | --------------- | --------------- |
| **Free**    | $0     | 10             | 50              | 100             |
| **Builder** | $17/mo | 100            | 1,000           | 1,000           |
| **Pro**     | $39/mo | 300            | Unlimited       | 4,000           |

## Credits

Credits are the universal unit for chat. Users choose their AI model per request; credit usage scales with model capability so margin is protected regardless of which model a user picks.

Monthly credit allowances reset on the billing cycle anniversary. Unused credits do not roll over. Top-up: 500 credits for $5, available to Builder and Pro via Polar one-time purchase. Free users see an upgrade prompt instead.

Credits per model are set so the credit cost always covers actual LLM cost with margin. The ratio between models reflects their real cost ratio (for example `gpt-5.1` vs `gpt-5-mini`), so credit pricing scales with capability. Exact credit burn by token usage will be finalized when model pricing is fully benchmarked.

## Monthly Video Cap

The monthly video cap limits new ingestion per billing cycle and resets on the billing anniversary. The total video cap is a lifetime ceiling on videos in the account.

**Deleting a video does not restore monthly or lifetime quota.** Ingestion is the cost event - transcript fetch, embedding, and insight generation are spent at ingest time regardless of later deletion.

## Principles

- **Credits, not message counts** - users choose their model; credit costs per model are calibrated with at least 2x margin over actual API cost. Recalibrate if OpenAI pricing changes significantly.
- **Monthly video caps** - reset each billing cycle. Predictable costs for both the user and the platform. Pro users with unlimited total videos still face a monthly ingestion rate limit.
- **Never lose money on a user** - credit deduction happens server-side before the LLM call. If credits are insufficient, the request is blocked with a top-up prompt.
- **Top-ups convert frustration into revenue** - surface at the exact moment of limit-hit, never proactively. Builder and Pro only; Free users see an upgrade prompt instead.
- **Free plan** demonstrates core value within tight but honest limits. Tight enough to convert, generous enough to show the product works.
- **Annual billing** (post-MVP): offer 2 months free framing (~17% discount). Improves cash flow significantly and increases LTV. Builder annual = $170/yr (~$14.17/mo equivalent). Pro annual = $390/yr (~$32.50/mo equivalent).

---

## Cost Basis (approximate, March 2026)

- Transcript fetch: ~$0.005-0.017 per video (TranscriptAPI, volume dependent)
- Embedding: ~$0.0001-0.0003 per video (OpenAI `text-embedding-3-small`)
- Insight generation: ~$0.003-0.013 per video (OpenAI `gpt-5-mini`, transcript length dependent)
- Total ingestion cost: ~$0.008-0.030 per video (transcript + embedding + insights)
- Chat (fast model): token-based at OpenAI `gpt-5-mini` rates (input + output tokens)
- Chat (smart model): token-based at OpenAI `gpt-5.1` rates (input + output tokens)
- Example only (not a fixed request cost): 3k input + 900 output tokens is about $0.0026 on `gpt-5-mini` and about $0.0128 on `gpt-5.1`
- Polar fees: base 4% + $0.40 per transaction, with +1.5% for international cards and +0.5% for subscriptions where applicable
