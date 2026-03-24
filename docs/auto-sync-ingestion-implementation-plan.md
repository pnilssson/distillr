# Automatic Resource Ingestion Implementation Plan

## Goal

Add opt-in automatic ingestion for playlist and channel sources so newly published videos are discovered and ingested into a user's library over time.

This implementation must:

- keep auto-sync off by default
- support playlist and channel sources only
- mark newly discovered over-limit items as failed with a quota reason
- correctly support overlapping sources in the same library

## Product Decisions

- Auto-sync is per-source, user-toggleable, and disabled by default.
- Only `youtube_playlist` and `youtube_channel` can enable auto-sync.
- `youtube_video` sources are never auto-synced.
- Scheduler runs hourly, target cadence per source is every 4 hours with jitter.
- If monthly quota is exhausted, items are marked failed with a clear quota reason and can be retried by future planning cycles.
- One content item can belong to multiple sources in the same library.

## Architecture Overview

### 1) Data model changes

- Add source sync metadata (enable flag, next/last sync timestamps, failure counters, cursor state).
- Replace single-source ownership assumptions with a source-to-content-item join model.
- Keep `content_items` library-deduped by identity.
- Reuse `failed` for quota-blocked items with explicit quota failure reasons.

### 2) Workflow split

- Keep `source.added` for initial/full discovery.
- Add `source.sync` for incremental discovery and queue planning.
- Add a scheduled scanner function to enqueue due sync jobs.

### 3) Incremental detection strategy

- Channel sync: poll uploads playlist head, stop on known marker, hydrate unseen IDs.
- Playlist sync: poll head with overlap window, bounded fallback when head marker disappears.
- Do not use `search.list` for polling.

### 4) Quota-aware admission behavior

- Admission checks still use billing allowances.
- Items blocked by quota are marked failed with reason `Monthly ingestion limit reached.`
- Quota-blocked failed items remain eligible for retry when source planning runs again.

### 5) UX/API behavior

- Add per-source auto-sync toggle and status fields in source responses.
- Keep manual source refresh separate from auto-sync.
- Keep user-facing errors provider-agnostic.

### 6) Concurrency and reliability

- Scheduled scanner claims due sources safely.
- Per-source sync serialized by source ID.
- Preserve per-user queue safety and idempotent upserts.
- Add throttling/jitter to smooth workload spikes.

### 7) Observability

- Track sync lifecycle events (queued, started, completed, failed).
- Capture technical details in logs and Sentry; keep UI copy provider-agnostic.

## Implementation Phases

1. Data model foundation
2. Provider incremental sync contracts
3. Inngest scheduler + per-source sync function
4. Quota failure-reason behavior
5. API + UI toggle and status surfaces
6. Docs updates and validation

## Acceptance Criteria

1. Auto-sync is opt-in and off by default.
2. New playlist/channel videos are auto-discovered for enabled sources.
3. Quota-blocked items are marked failed with explicit quota reasons.
4. Overlapping sources in a library are modeled without ownership conflicts.
5. Deleting one source does not remove shared content still referenced by another source.
6. Background sync does not churn source processing UX state.
7. Typecheck, lint, and build pass.
