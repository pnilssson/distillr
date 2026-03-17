CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"requested_mode" text,
	"effective_mode" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"sources_json" jsonb,
	"evidence_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"title" text DEFAULT 'New chat' NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "content_chunk_anchors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"content_chunk_id" uuid NOT NULL,
	"anchor_key" text NOT NULL,
	"anchor_type" text NOT NULL,
	"start_value" double precision,
	"end_value" double precision,
	"label" text,
	"url_fragment" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_chunk_anchors_chunk_anchor_uniq" UNIQUE("content_chunk_id","anchor_key")
);
--> statement-breakpoint
ALTER TABLE "content_chunk_anchors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "content_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"item_title" text NOT NULL,
	"start_seconds" double precision,
	"end_seconds" double precision,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_chunks_item_chunk_uniq" UNIQUE("content_item_id","chunk_index")
);
--> statement-breakpoint
ALTER TABLE "content_chunks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "content_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"insight_type" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_insights_item_type_uniq" UNIQUE("content_item_id","insight_type")
);
--> statement-breakpoint
ALTER TABLE "content_insights" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"content_type" text NOT NULL,
	"title" text NOT NULL,
	"thumbnail_url" text NOT NULL,
	"channel_name" text NOT NULL,
	"channel_id" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"duration_seconds" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"transcript_raw" text,
	"summary" text,
	"key_insights" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_items_library_content_external_uniq" UNIQUE("library_id","content_type","external_id")
);
--> statement-breakpoint
ALTER TABLE "content_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "libraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "libraries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"url" text NOT NULL,
	"source_key" text NOT NULL,
	"source_type" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"channel_name" text,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunk_anchors" ADD CONSTRAINT "content_chunk_anchors_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunk_anchors" ADD CONSTRAINT "content_chunk_anchors_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunk_anchors" ADD CONSTRAINT "content_chunk_anchors_content_chunk_id_content_chunks_id_fk" FOREIGN KEY ("content_chunk_id") REFERENCES "public"."content_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_insights" ADD CONSTRAINT "content_insights_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_insights" ADD CONSTRAINT "content_insights_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_library_id_idx" ON "chat_messages" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "chat_messages_user_id_idx" ON "chat_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_library_id_idx" ON "chat_sessions" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_last_message_at_idx" ON "chat_sessions" USING btree ("last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "content_chunk_anchors_library_id_idx" ON "content_chunk_anchors" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "content_chunk_anchors_content_item_id_idx" ON "content_chunk_anchors" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "content_chunk_anchors_content_chunk_id_idx" ON "content_chunk_anchors" USING btree ("content_chunk_id");--> statement-breakpoint
CREATE INDEX "content_chunk_anchors_anchor_type_idx" ON "content_chunk_anchors" USING btree ("anchor_type");--> statement-breakpoint
CREATE INDEX "content_chunk_anchors_user_id_idx" ON "content_chunk_anchors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_chunks_library_id_idx" ON "content_chunks" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "content_chunks_content_item_id_idx" ON "content_chunks" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "content_chunks_user_id_idx" ON "content_chunks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_chunks_embedding_idx" ON "content_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "content_chunks_chunk_text_fts_idx" ON "content_chunks" USING gin (to_tsvector('english', "chunk_text"));--> statement-breakpoint
CREATE INDEX "content_insights_library_id_idx" ON "content_insights" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "content_insights_content_item_id_idx" ON "content_insights" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "content_insights_user_id_idx" ON "content_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_insights_embedding_idx" ON "content_insights" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "content_items_library_id_idx" ON "content_items" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "content_items_source_id_idx" ON "content_items" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "libraries_user_id_idx" ON "libraries" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "libraries_user_id_name_idx" ON "libraries" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "sources_library_id_idx" ON "sources" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "sources_user_id_idx" ON "sources" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_library_id_source_key_idx" ON "sources" USING btree ("library_id","source_key");--> statement-breakpoint
CREATE POLICY "chat_messages_select_own" ON "chat_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_messages_insert_own" ON "chat_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_messages_update_own" ON "chat_messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_messages_delete_own" ON "chat_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_sessions_select_own" ON "chat_sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_sessions_insert_own" ON "chat_sessions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_sessions_update_own" ON "chat_sessions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_sessions_delete_own" ON "chat_sessions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_chunk_anchors_select_own" ON "content_chunk_anchors" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_chunk_anchors_insert_own" ON "content_chunk_anchors" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_chunk_anchors_update_own" ON "content_chunk_anchors" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_chunk_anchors_delete_own" ON "content_chunk_anchors" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_chunks_select_own" ON "content_chunks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_chunks_insert_own" ON "content_chunks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_chunks_update_own" ON "content_chunks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_chunks_delete_own" ON "content_chunks" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_insights_select_own" ON "content_insights" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_insights_insert_own" ON "content_insights" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_insights_update_own" ON "content_insights" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_insights_delete_own" ON "content_insights" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_items_select_own" ON "content_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_items_insert_own" ON "content_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_items_update_own" ON "content_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "content_items_delete_own" ON "content_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "libraries_select_own" ON "libraries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "libraries_insert_own" ON "libraries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "libraries_update_own" ON "libraries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "libraries_delete_own" ON "libraries" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "sources_select_own" ON "sources" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "sources_insert_own" ON "sources" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "sources_delete_own" ON "sources" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);