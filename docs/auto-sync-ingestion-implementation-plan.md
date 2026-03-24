# Automatic Resource Ingestion Implementation Plan

## Goal

Add opt-in automatic ingestion for playlist and channel sources so newly published videos are discovered and ingested into a user's library over time.

This implementation must:

- keep auto-sync off by default
- support playlist and channel sources only
- defer newly discovered items when users are out of monthly ingestion quota
- correctly support overlapping sources in the same library

## Product Decisions

- Auto-sync is per-source, user-toggleable, and disabled by default.
- Only `youtube_playlist` and `youtube_channel` can enable auto-sync.
- `youtube_video` sources are never auto-synced.
- Scheduler runs hourly, target cadence per source is every 4 hours with jitter.
- If monthly quota is exhausted, items wait for future sync cycles instead of being marked failed.
- One content item can belong to multiple sources in the same library.

## Architecture Overview

### 1) Data model changes

- Add source sync metadata (enable flag, next/last sync timestamps, failure counters, cursor state).
- Replace single-source ownership assumptions with a source-to-content-item join model.
- Keep `content_items` library-deduped by identity.
- Introduce a non-terminal deferred state for discovered items blocked by quota.

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
- Items blocked by quota are retained in a waiting state and retried on later sync cycles.
- Quota exhaustion is not a terminal item failure state.

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

- Track sync lifecycle events (queued, started, completed, failed, deferred).
- Capture technical details in logs and Sentry; keep UI copy provider-agnostic.

## Implementation Phases

1. Data model foundation
2. Provider incremental sync contracts
3. Inngest scheduler + per-source sync function
4. Quota deferral behavior
5. API + UI toggle and status surfaces
6. Docs updates and validation

## Acceptance Criteria

1. Auto-sync is opt-in and off by default.
2. New playlist/channel videos are auto-discovered for enabled sources.
3. Quota-blocked items are deferred and retried in future cycles.
4. Overlapping sources in a library are modeled without ownership conflicts.
5. Deleting one source does not remove shared content still referenced by another source.
6. Background sync does not churn source processing UX state.
7. Typecheck, lint, and build pass.
