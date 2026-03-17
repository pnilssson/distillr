import { sql } from "drizzle-orm";
import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgRole,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

const authenticatedRole = pgRole("authenticated").existing();

export const libraries = pgTable(
  "libraries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("libraries_user_id_idx").on(table.userId),
    uniqueIndex("libraries_user_id_name_idx").on(table.userId, table.name),
    pgPolicy("libraries_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
    pgPolicy("libraries_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("libraries_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("libraries_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
  ],
).enableRLS();

export type Library = typeof libraries.$inferSelect;

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    libraryId: uuid("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_sessions_library_id_idx").on(table.libraryId),
    index("chat_sessions_user_id_idx").on(table.userId),
    index("chat_sessions_last_message_at_idx").on(table.lastMessageAt.desc()),
    pgPolicy("chat_sessions_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
    pgPolicy("chat_sessions_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("chat_sessions_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("chat_sessions_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
  ],
).enableRLS();

export type ChatSession = typeof chatSessions.$inferSelect;

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    libraryId: uuid("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'user' | 'assistant'
    content: text("content").notNull(),
    model: text("model"),
    status: text("status").notNull().default("completed"), // 'completed' | 'aborted' | 'failed'
    requestedMode: text("requested_mode"), // 'auto' | 'library' | 'chat'
    effectiveMode: text("effective_mode"), // 'library' | 'chat'
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalTokens: integer("total_tokens"),
    sourcesJson: jsonb("sources_json").$type<unknown>(),
    evidenceJson: jsonb("evidence_json").$type<unknown>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_messages_session_id_created_at_idx").on(table.sessionId, table.createdAt),
    index("chat_messages_library_id_idx").on(table.libraryId),
    index("chat_messages_user_id_idx").on(table.userId),
    pgPolicy("chat_messages_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
    pgPolicy("chat_messages_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("chat_messages_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("chat_messages_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
  ],
).enableRLS();

export type ChatMessage = typeof chatMessages.$inferSelect;

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    libraryId: uuid("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sourceKey: text("source_key").notNull(),
    sourceType: text("source_type").notNull(), // 'youtube_video' | 'youtube_playlist' | 'youtube_channel'
    status: text("status").notNull().default("processing"), // 'processing' | 'ready' | 'failed'
    channelName: text("channel_name"),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("sources_library_id_idx").on(table.libraryId),
    index("sources_user_id_idx").on(table.userId),
    uniqueIndex("sources_library_id_source_key_idx").on(table.libraryId, table.sourceKey),
    pgPolicy("sources_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
    pgPolicy("sources_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("sources_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
  ],
).enableRLS();

export type Source = typeof sources.$inferSelect;

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    libraryId: uuid("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalId: text("youtube_video_id").notNull(),
    contentType: text("content_type").notNull(),
    title: text("title").notNull(),
    thumbnailUrl: text("thumbnail_url").notNull(),
    channelName: text("channel_name").notNull(),
    channelId: text("channel_id").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'ready' | 'failed'
    failureReason: text("failure_reason"),
    chunkCount: integer("chunk_count").notNull().default(0),
    tokenCount: integer("token_count").notNull().default(0),
    transcriptRaw: text("transcript_raw"),
    summary: text("summary"),
    keyInsights: text("key_insights"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("videos_library_video_uniq").on(
      table.libraryId,
      table.contentType,
      table.externalId,
    ),
    index("videos_library_id_idx").on(table.libraryId),
    index("videos_source_id_idx").on(table.sourceId),
    pgPolicy("videos_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
    pgPolicy("videos_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("videos_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("videos_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
  ],
).enableRLS();

export type Video = typeof videos.$inferSelect;

export const videoChunks = pgTable(
  "video_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    libraryId: uuid("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    chunkText: text("chunk_text").notNull(),
    videoTitle: text("video_title").notNull(),
    startSeconds: doublePrecision("start_seconds"),
    endSeconds: doublePrecision("end_seconds"),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("video_chunks_video_chunk_uniq").on(table.videoId, table.chunkIndex),
    index("video_chunks_library_id_idx").on(table.libraryId),
    index("video_chunks_video_id_idx").on(table.videoId),
    index("video_chunks_user_id_idx").on(table.userId),
    index("video_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("video_chunks_chunk_text_fts_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.chunkText})`,
    ),
    pgPolicy("video_chunks_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
    pgPolicy("video_chunks_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("video_chunks_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("video_chunks_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
  ],
).enableRLS();

export type VideoChunk = typeof videoChunks.$inferSelect;

export const videoInsights = pgTable(
  "video_insights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    libraryId: uuid("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    insightType: text("insight_type").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("video_insights_video_type_uniq").on(table.videoId, table.insightType),
    index("video_insights_library_id_idx").on(table.libraryId),
    index("video_insights_video_id_idx").on(table.videoId),
    index("video_insights_user_id_idx").on(table.userId),
    index("video_insights_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    pgPolicy("video_insights_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
    pgPolicy("video_insights_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("video_insights_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
      withCheck: sql`auth.uid() = user_id`,
    }),
    pgPolicy("video_insights_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.uid() = user_id`,
    }),
  ],
).enableRLS();

export type VideoInsight = typeof videoInsights.$inferSelect;
