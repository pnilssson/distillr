# Data Architecture

## Core Principle

Every row in every table carries `user_id`. Supabase RLS policies enforce this at the database level - a misconfigured query cannot leak cross-user data.

---

## Entity Hierarchy

```
users (Supabase Auth)
  └── libraries           - named knowledge collections
        ├── sources        - YouTube URLs added to the library (channel/playlist/video)
        │     └── videos  - individual videos discovered + ingested
        │           └── video_chunks  - transcript chunks + vector embeddings
        └── chat_sessions
              └── chat_messages
```

---

## Key Schema Decisions

- `library_id` AND `user_id` are **always denormalized** on `video_chunks` - this enables both library-scoped search (MVP) and future cross-library search without schema migration
- `videos.status` uses text + check constraint (not Postgres enum) - easier to evolve
- `videos.summary` and `videos.key_insights` are cached on the video row after first generation - never re-run against the LLM unless explicitly requested
- HNSW index on `video_chunks.embedding` - fast approximate nearest neighbor search
- Chat messages store token counts for usage metering
- Unique constraint on `(library_id, youtube_video_id)` - prevents duplicate videos within the same library
- Same video across different libraries of the same user is explicitly allowed - this is intentional curation, not a mistake
- All foreign keys use `ON DELETE CASCADE` - deleting a library removes all sources, videos, chunks, chat sessions, and messages atomically. No orphaned rows, no soft deletes.

---

## Deletion Behavior

Hard cascade deletes throughout. No soft deletes - they add complexity to every query and there is no meaningful undo use case for a personal knowledge base.

Cascade chain:

```
libraries → sources → videos → video_chunks
libraries → chat_sessions → chat_messages
```

UI responsibility: show a confirmation modal before destructive actions ("This will delete X videos and all chat history") - the database handles the rest automatically.

---

## Multi-Tenant Isolation

RLS policies on every table:

```sql
CREATE POLICY "user_own_libraries" ON libraries FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_own_videos" ON videos FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_own_chunks" ON video_chunks FOR ALL USING (user_id = auth.uid());
```

The vector similarity search function respects these policies automatically - no additional filtering needed in application code.
