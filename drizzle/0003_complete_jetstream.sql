CREATE TABLE "video_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"video_title" text NOT NULL,
	"start_seconds" double precision NOT NULL,
	"end_seconds" double precision NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_chunks_video_chunk_uniq" UNIQUE("video_id","chunk_index")
);
--> statement-breakpoint
ALTER TABLE "video_chunks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "video_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"insight_type" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_insights_video_type_uniq" UNIQUE("video_id","insight_type")
);
--> statement-breakpoint
ALTER TABLE "video_insights" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "video_chunks" ADD CONSTRAINT "video_chunks_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_chunks" ADD CONSTRAINT "video_chunks_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_insights" ADD CONSTRAINT "video_insights_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_insights" ADD CONSTRAINT "video_insights_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_chunks_library_id_idx" ON "video_chunks" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "video_chunks_video_id_idx" ON "video_chunks" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "video_chunks_user_id_idx" ON "video_chunks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_chunks_embedding_idx" ON "video_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "video_chunks_chunk_text_fts_idx" ON "video_chunks" USING gin (to_tsvector('english', "chunk_text"));--> statement-breakpoint
CREATE INDEX "video_insights_library_id_idx" ON "video_insights" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "video_insights_video_id_idx" ON "video_insights" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "video_insights_user_id_idx" ON "video_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_insights_embedding_idx" ON "video_insights" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE POLICY "video_chunks_select_own" ON "video_chunks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "video_chunks_insert_own" ON "video_chunks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "video_chunks_update_own" ON "video_chunks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "video_chunks_delete_own" ON "video_chunks" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "video_insights_select_own" ON "video_insights" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "video_insights_insert_own" ON "video_insights" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "video_insights_update_own" ON "video_insights" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "video_insights_delete_own" ON "video_insights" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);