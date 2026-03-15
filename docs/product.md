# What is Distillr?

Distillr is a **YouTube knowledge base SaaS**. Users add YouTube channels, playlists, or individual videos and Distillr extracts the transcripts, processes them with AI, and turns them into a persistent, searchable knowledge base they can chat with and export from.

The mental model: **not a transcript downloader. A second brain for video content.**

Where competitors like Transcribr focus on extraction and file export, Distillr focuses on long-term knowledge accumulation. Users build Libraries over time, ask cross-video questions, and export structured knowledge - not raw transcripts.

---

# The Problem We Solve

YouTube is one of the richest knowledge sources on the internet, but it is fundamentally unsearchable and non-persistent. Watching 200 hours of content on a topic leaves you with no artifact. Nothing you can query, reference, or build on.

Distillr turns video content into something durable: a personal knowledge base that understands what was said across hundreds of videos, can answer questions with compact timestamp-linked sources, and lets you export structured insights into your own tools.

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
| **Builder** | $19/mo | 100            | 1,000           | 900             |
| **Pro**     | $49/mo | 300            | Unlimited       | 2,500           |

## Credits

Credits are the universal unit for chat. Users choose their AI model per request; credit usage scales with model capability so margin is protected regardless of which model a user picks.

Monthly credit allowances reset on the billing cycle anniversary. Unused credits do not roll over. Top-up: 500 credits for $9, available to Builder and Pro via Polar one-time purchase. Free users see an upgrade prompt instead.

Credits per model are set so the credit cost always covers actual LLM cost with margin. The ratio between models reflects their real cost ratio (for example `gpt-5.1` vs `gpt-5-mini`), so credit pricing scales with capability. Exact credit burn is controlled server-side by model pricing config and is reviewed whenever provider pricing changes.

## Monthly Video Cap

The monthly video cap limits new ingestion per billing cycle and resets on the billing anniversary. The total video cap is a lifetime ceiling on videos in the account.

**Deleting a video does not restore monthly or lifetime quota.** Ingestion is the cost event - transcript fetch, embedding, and insight generation are spent at ingest time regardless of later deletion.

## Principles

- **Credits, not message counts** - users choose their model; credit costs per model are calibrated with at least 2x margin over actual API cost. Recalibrate if OpenAI pricing changes significantly.
- **Monthly video caps** - reset each billing cycle. Predictable costs for both the user and the platform. Pro users with unlimited total videos still face a monthly ingestion rate limit.
- **Balance safety over strict reservation** - chat requests are blocked when account balance is below 1 credit, and displayed balances are clamped to 0 so users cannot continue once depleted.
- **Top-ups convert frustration into revenue** - surface at the exact moment of limit-hit, never proactively. Builder and Pro only; Free users see an upgrade prompt instead.
- **Free plan** demonstrates core value within tight but honest limits. Tight enough to convert, generous enough to show the product works.
- **Annual billing** (post-MVP): offer 2 months free framing (~17% discount). Improves cash flow significantly and increases LTV. Builder annual = $190/yr (~$15.83/mo equivalent). Pro annual = $490/yr (~$40.83/mo equivalent).

---

## Cost Governance (March 2026)

- Ingestion cost is variable by transcript length, token volume, and downstream processing. Distillr does not treat ingestion as a fixed per-video cost.
- Chat cost is token-based at OpenAI rates (`gpt-5-mini` and `gpt-5.1`) using input, cached input, and output token pricing.
- Credit burn is controlled server-side with `POLAR_CHAT_CREDITS_PER_USD=100` and model-specific cost mapping.
- Top-up pricing is calibrated for positive unit margin after tax and payment fees.
- Pricing and limits are reviewed monthly against observed `$ai_generation` token/cost telemetry and billing fee data.
