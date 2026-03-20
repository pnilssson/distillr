# Distillr Analytics Gap Analysis & Improvement Plan

## Data-Driven Findings (from PostHog API, March 20 2026)

### Key Numbers (Last 90 Days)

| Metric | Value | Note |
|--------|-------|------|
| Libraries created | 10 | All in last 2 weeks |
| Sources added | 37 | 33 in week 1, 4 in week 2 |
| Videos processed | 62 | |
| Videos failed | 11 | **15% failure rate** |
| Chat messages sent | 14 | Low engagement signal |
| Peak unique visitors/day | 12 | March 14 |
| Peak unique chatters/day | 2 | March 15 |
| Total AI cost (30d) | $0.64 | |
| Top AI cost driver | `ingestion_insights` | 69% of total ($0.44) |

### Critical Finding: 4 Billing Events Never Fired

These events exist in code but have **never appeared in PostHog**:

- `upgrade_prompt_shown` -- never fired (no user has hit credit wall yet)
- `top_up_clicked` -- never fired
- `top_up_purchased` -- never fired
- `plan_upgraded` -- never fired

This means either (a) no user has hit the upgrade flow yet, or (b) there's a bug preventing these events from reaching PostHog. **Verify these work before launch.**

### AI Cost Breakdown by Operation

| Operation | Cost (30d) | % of Total |
|-----------|-----------|------------|
| `ingestion_insights` | $0.440 | 69% |
| `chat_generation` | $0.183 | 29% |
| `ingestion_chunk_embeddings` | $0.011 | 1.7% |
| `chat_mode_classification` | $0.003 | 0.5% |
| `chat_query_rewrite` | $0.003 | 0.4% |
| `ingestion_insight_embeddings` | $0.001 | 0.1% |
| `chat_query_embeddings` | $0.000 | ~0% |

`ingestion_insights` dominates cost. As you scale users, this ratio will matter a lot for unit economics. Worth monitoring cost-per-video and cost-per-chat-message as dedicated metrics.

---

## Current State Summary

### Events Currently Tracked (13 in code, 19 in PostHog incl. auto-capture)

| Event | Location | Properties |
|-------|----------|------------|
| `library_created` | Server (API route) | `library_id` |
| `source_added` | Server (API route) | `library_id`, `source_type` |
| `video_ready` | Server (Inngest) | `library_id`, `video_id`, `source_id`, `chunk_count`, `token_count` |
| `video_failed` | Server (Inngest) | `library_id`, `video_id`, `source_id`, `reason` |
| `chat_message_sent` | Server (service) | `library_id`, `session_id` |
| `upgrade_prompt_shown` | Server (service) | `library_id`, `source: "chat"` |
| `upgrade_clicked` | Server (API route) | `target_plan`, `source: "checkout"` |
| `top_up_clicked` | Server (API route) | `target: "top_up_250"`, `source: "checkout"` |
| `billing_portal_opened` | Server (API route) | none |
| `top_up_purchased` | Server (webhook) | `source`, `webhook_id`, `idempotency_key` |
| `plan_upgraded` | Server (webhook) | `plan`, `billing_reason`, `source`, `webhook_id`, `idempotency_key` |
| `billing_usage_terminal_failed` | Server (Inngest) | (on terminal failures) |
| `$ai_generation` | Server (custom fn) | `provider`, `model`, `model_alias`, `operation`, `tokens_in/out`, `cost_usd`, `latency_ms`, `status`, `library_id`, `session_id` |

### MVP Product & AI Overview Dashboard (9 panels)

1. **Product - Activation funnel**: library_created -> source_added -> video_ready -> chat_message_sent
2. **Product - Chat messages (day)**
3. **Product - Sources and libraries created (week)**
4. **Ingestion - Ready vs failed**
5. **AI - Cost (USD/day)**
6. **AI - Tokens total (day)**
7. **AI - Cost by model alias**
8. **AI - Latency p95 (chat vs ingestion)**
9. **AI - Output capped rate**

### Also Active: PostHog LLM Analytics Dashboard (auto-generated, 9 panels)

Traces, Generative AI users, Total cost, Cost per user, Cost by model, Generation calls, AI Errors, Generation latency by model, Generations by HTTP status.

---

## Gap Analysis

### Critical Gaps (High Impact, Should Fix Now)

#### 1. No `user_signed_up` event

This is the single most impactful missing event. PostHog explicitly calls this out as the #1 event every team should track. Without it you cannot:

- Measure acquisition (signups/day, signups by source)
- Build proper retention cohorts (Day 1, Day 7, Day 30 retention from signup)
- Calculate activation rate (% of signups who reach aha moment)
- Measure time-to-first-value (TTFV) from signup to first chat message
- Calculate CAC or LTV properly

**Current state**: The activation funnel starts at `library_created`, completely skipping the signup step. You're blind to how many users sign up but never create a library.

**Fix**: Add `user_signed_up` in the Supabase auth callback handler (`/auth/callback`). Properties: `auth_method` (magic_link), `referral_source` (UTM params if available).

#### 2. No retention/engagement metrics on dashboard

The dashboard tracks activity volume but not retention. You have no way to answer "are users coming back?" which is arguably the most important question for an MVP.

**Add to dashboard**:
- Weekly retention cohort (based on `chat_message_sent`)
- DAU/WAU ratio (stickiness)
- Returning vs new users per week

#### 3. No `subscription_cancelled` / `plan_downgraded` event

You track `plan_upgraded` and `top_up_purchased`, but not the inverse. You can't measure churn rate, identify churn signals, or build a proper revenue funnel.

**Fix**: Add events in Polar webhook handler for subscription cancellation and plan changes. Events: `subscription_cancelled` (with `plan`, `reason` if available, `lifetime_value`), `plan_downgraded` (with `from_plan`, `to_plan`).

#### 4. Activation funnel is incomplete

The current funnel (library_created -> source_added -> video_ready -> chat_message_sent) misses the critical first step: signup. It should be:

`user_signed_up` -> `library_created` -> `source_added` -> `video_ready` -> `chat_message_sent`

This lets you see the real drop-off, which is likely biggest between signup and library creation.

#### 5. No billing/upgrade funnel on dashboard

You track `upgrade_prompt_shown` -> `upgrade_clicked` -> `plan_upgraded` in events, but there's no funnel visualization for this on the dashboard. This is your revenue conversion funnel and should be front and center.

**Add**: Upgrade conversion funnel panel to dashboard.

---

### Important Gaps (Medium Impact, Should Plan For)

#### 6. No `chat_session_created` event

You track messages but not session creation. Without this you can't measure:
- Sessions per user (engagement depth)
- Messages per session (conversation quality)
- Empty sessions (users who open chat but don't ask anything)

**Fix**: Track `chat_session_created` in the session creation API route. Properties: `library_id`.

#### 7. No credit/usage tracking events

You only track `upgrade_prompt_shown` when credits run out. You're missing the journey to that point.

**Add**:
- `credits_low` (when user drops below 20% of monthly allocation) with `remaining_credits`, `plan`
- This helps identify users who will churn before they hit the wall

#### 8. No user properties / plan segmentation

All your dashboard panels show aggregate numbers. You can't break down any metric by plan tier. "Are Pro users sending more messages than Free users?" is unanswerable.

**Fix**: Set PostHog person properties on signup and plan change: `plan`, `signup_date`, `library_count`, `total_videos`. Then add plan breakdowns to key dashboard panels.

#### 9. No `source_deleted` / `library_deleted` events

Deletion is a strong churn signal. If a user deletes their only library, they're probably leaving.

**Fix**: Track these in the respective API routes with `library_id`, `source_count` (for library deletion), `video_count`.

#### 10. Missing Time to First Value (TTFV) metric

TTFV (signup to first `chat_message_sent`) is one of the most critical SaaS activation metrics. With `user_signed_up` added, you can calculate this, but it should be an explicit dashboard metric.

**Add**: TTFV trend panel showing median time from signup to first chat message.

---

### Nice-to-Have Gaps (Lower Priority, Plan for Later)

#### 11. No chat quality signals

You track that messages were sent, but not whether they were useful. Consider:
- `chat_citation_clicked` (user clicked a timestamp link back to video - strong quality signal)
- `chat_feedback` (thumbs up/down on responses, if you add this UI)
- Track `finish_reason` distribution on the dashboard (already captured in `$ai_generation`)

#### 12. No feature adoption tracking

Which features drive retention? You can't tell. Consider tracking:
- `export_used` (if/when export feature launches)
- `video_search_used` (searching within library)
- `cross_video_query` vs `single_video_query` (query scope)

#### 13. No error tracking from user perspective

`video_failed` is tracked but there's no user-facing error event. When a user sees an error in chat (rate limit, processing failure, etc.), that's not captured as a distinct product event.

**Consider**: `user_error_shown` with `error_type`, `context` (chat/ingestion/billing).

#### 14. Internal user filtering

Client-side PostHog is initialized with `opt_out_capturing_by_default: true`, which is good for privacy but means you're relying entirely on server-side events. Make sure your own team's usage is filtered out in PostHog (set a person property `is_internal: true` and use PostHog's internal user filter).

#### 15. No onboarding funnel tracking

The empty dashboard state is your onboarding experience. You don't track:
- `onboarding_started` (user sees empty state)
- `onboarding_cta_clicked` (user clicks create library from empty state)

This would help you optimize the critical first experience.

---

## Suggested Implementation Plan

### Phase 1: Foundations (Week 1)

These are the highest-ROI changes and mostly just require adding `captureServerEvent` calls in existing code paths.

- [ ] Add `user_signed_up` event in auth callback
- [ ] Add `subscription_cancelled` event in Polar webhook handler
- [ ] Set person properties (`plan`, `signup_date`) on signup and plan changes
- [ ] Update activation funnel to start with `user_signed_up`
- [ ] Add upgrade conversion funnel to dashboard (upgrade_prompt_shown -> upgrade_clicked -> plan_upgraded)
- [ ] Add weekly retention cohort panel to dashboard
- [ ] Add DAU/WAU stickiness panel to dashboard
- [ ] Enable internal user filtering in PostHog

### Phase 2: Depth (Week 2-3)

- [ ] Add `chat_session_created` event
- [ ] Add `credits_low` event
- [ ] Add `source_deleted` / `library_deleted` events
- [ ] Add `plan_downgraded` event
- [ ] Add TTFV (time to first value) trend panel
- [ ] Add plan-tier breakdown to key dashboard panels (chat messages, activation funnel)
- [ ] Add messages-per-session metric panel

### Phase 3: Quality & Polish (Week 4+)

- [ ] Add `chat_citation_clicked` event (requires frontend tracking)
- [ ] Add feature adoption events as new features launch
- [ ] Add `user_error_shown` event
- [ ] Add onboarding funnel events
- [ ] Consider PostHog Surveys for NPS/CSAT after N chat messages
- [ ] Set up PostHog alerts for anomalies (sudden drop in signups, spike in video_failed)

---

## Quick Wins (Can Do Today)

These require zero code changes, just PostHog dashboard configuration:

1. **Add retention cohort** using `chat_message_sent` as the returning event
2. **Add a "Video ingestion success rate" number** panel -- currently at **85%** (62 ready / 73 total). That 15% failure rate needs watching.
3. **Break down chat messages by library** to see which libraries are most active
4. **Add alert on `video_failed` spike** -- 10 failures in one week is a lot for your volume
5. **Add alert on `billing_usage_terminal_failed`** -- already firing, needs attention
6. **Add a "cost per chat message" formula** panel -- currently ~$0.013/message (chat_generation cost / chat_message_sent count)
7. **Add a "cost per video ingested" formula** panel -- currently ~$0.007/video (ingestion costs / video_ready count)
8. **Verify billing events work** -- manually trigger the upgrade flow and confirm `upgrade_prompt_shown`, `upgrade_clicked`, `top_up_clicked`, `top_up_purchased`, and `plan_upgraded` actually reach PostHog. 4 of these have never fired.

---

## Dashboard Restructure Suggestion

The current dashboard mixes product and AI ops metrics. Consider splitting into:

**Dashboard 1: Product Health** (check daily)
- Signups trend
- Activation funnel (signup -> library -> source -> video_ready -> chat)
- Weekly retention cohort
- DAU/WAU stickiness
- Chat messages per day
- Upgrade conversion funnel
- Active libraries / sources trend

**Dashboard 2: AI Operations** (check when needed)
- Cost per day / per user
- Token usage by model
- Latency p95
- Output capped rate
- Error rate
- Keep existing panels, they're solid

**Dashboard 3: Revenue** (check weekly)
- MRR trend (via Polar/Stripe data or manual)
- Upgrades / downgrades / cancellations
- Credit usage distribution by plan
- Top-up purchase rate
