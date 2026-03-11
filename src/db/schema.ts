import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgPolicy,
  pgRole,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
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

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    libraryId: uuid("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sourceType: text("source_type").notNull(), // 'video' | 'playlist' | 'channel'
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
    youtubeVideoId: text("youtube_video_id").notNull(),
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
    unique("videos_library_video_uniq").on(table.libraryId, table.youtubeVideoId),
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
