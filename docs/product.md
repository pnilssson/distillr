# What is Distillr?

Distillr is a YouTube research tool. Users add YouTube channels, playlists, or individual videos and Distillr extracts the transcripts, processes them with AI, and turns them into a persistent, searchable knowledge base they can query and export from.

The core distinction: Distillr is not a transcript downloader. It is a research library that grows over time. Where tools like Transcribr focus on one-off extraction and file export, Distillr focuses on long-term accumulation. Users build libraries of sources they care about, ask questions across all of them at once, and get cited answers with timestamp links back to the original video.

---

# The Problem We Solve

YouTube is one of the richest knowledge sources on the internet. Thought leaders, domain experts, and niche creators publish thousands of hours of insight that never appears in search results, academic papers, or anywhere you can query it.

The workflow researchers use today is broken. Watch a video, copy the transcript, paste it into an LLM, ask a question. It works for one video. It collapses at ten. At fifty it is impossible. There is no memory across sessions, no cross-referencing between videos, no persistence.

Distillr fixes this at the source. Add your channels and playlists once. Ask questions across all of them. Get answers with cited sources and timestamps. Export structured insights into your own tools.

---

# Who Distillr Is For

## Primary: Independent Analysts and Substack Writers

These are people who publish original research or analysis and use YouTube as a primary source. They follow specific channels closely, need to quote and cite accurately, and currently have no good way to search or cross-reference across everything they have watched.

This includes independent analysts publishing on Substack or Ghost, freelance researchers and consultants who write for clients, finance and tech and policy writers who treat YouTube as a reporting source, and podcasters or journalists who track specific speakers over time.

The key insight about this group: they are already doing a version of this manually. They paste transcripts into ChatGPT. It breaks at volume. Distillr is not a new habit for them. It is a better version of something they already do.

## Secondary: Content Creators

Creators who mine competitor channels or inspirational channels for patterns, hooks, and angles. Higher volume users, less research-oriented. This is a natural Phase 2 audience once the core research use case is proven.

---

# What Makes Distillr Different

Most AI tools answer questions from general knowledge. Distillr answers questions from a specific corpus the user owns and curates. The answers are grounded in real sources the user chose, cited with timestamps, not hallucinated from training data.

The closest competitors are NotebookLM (Google) and Recall. NotebookLM does not persist libraries across sessions or support cross-notebook queries at scale. Recall treats YouTube as one of many source types without deep semantic indexing. Neither is built specifically for the YouTube-as-research-source use case.

Distillr's defensible position is: one data type (YouTube), one primary audience (researchers and analysts), persistent and queryable at library scale.

---

# Product Experience Principles

Distillr should feel like one cohesive product from end to end. Users should never feel like they are jumping between separate tools when moving from dashboard to library to chat.

Core principles for authenticated product surfaces:

- Shared page rhythm: use a consistent content width and comparable vertical spacing for page headers, top metrics, and primary sections.
- Reused UI language: equivalent information should use the same visual treatment across pages, especially metric cards, list headers, and list rows.
- Familiar interactions: hover, focus, empty-state behavior, and action placement should stay predictable across surfaces.
- Intentional divergence only: visual differences are allowed when they communicate a different job-to-be-done, not as incidental styling drift.

These principles reduce cognitive load, strengthen trust, and make the product feel more polished as the surface area grows.

---

# Pricing Model

| Plan    | Price  | Monthly indexed videos | Total stored indexed videos | Monthly chat credits |
| ------- | ------ | ---------------------- | --------------------------- | -------------------- |
| Free    | $0     | 15                     | 100                         | 50                   |
| Builder | $19/mo | 150                    | 2,000                       | 650                  |
| Pro     | $49/mo | 500                    | Unlimited                   | 1,800                |

Credits are the universal unit for chat. Users choose their AI model per request and credit usage scales with model capability. Monthly credits reset on the billing anniversary and do not roll over. Builder and Pro users can top up with 250 credits for $5. Free users see an upgrade prompt instead.

Each indexed video counts as one video toward monthly indexing and total stored limits, regardless of video length.

Deleting a video does not restore monthly or lifetime quota. Ingestion is the cost event: transcript fetch, embedding, and processing are spent at ingest time regardless of later deletion.

Annual billing is planned post-MVP at a two-months-free discount (Builder $190/yr, Pro $490/yr).

---

# What Distillr Is Not

Distillr is not a competitor to general-purpose LLMs like Claude, ChatGPT, or Gemini. Those answer from broad training data. Distillr answers from a specific corpus the user built and owns.

Distillr is not a transcript downloader. The value is persistence, search, and cross-video querying, not the file.

Distillr is not a second brain or PKM tool. It does not ask users to build a system or maintain a workflow. It asks them to add sources and start asking questions.

Distillr is not for casual YouTube viewers. It is built for people with research intent and a specific set of sources they follow seriously.
