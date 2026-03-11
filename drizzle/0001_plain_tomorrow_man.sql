CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"url" text NOT NULL,
	"source_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"youtube_video_id" text NOT NULL,
	"title" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"transcript_raw" text,
	"summary" text,
	"key_insights" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "videos_library_video_uniq" UNIQUE("library_id","youtube_video_id")
);
--> statement-breakpoint
ALTER TABLE "videos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sources_library_id_idx" ON "sources" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "sources_user_id_idx" ON "sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "videos_library_id_idx" ON "videos" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "videos_source_id_idx" ON "videos" USING btree ("source_id");--> statement-breakpoint
CREATE POLICY "sources_select_own" ON "sources" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "sources_insert_own" ON "sources" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "sources_delete_own" ON "sources" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "videos_select_own" ON "videos" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "videos_insert_own" ON "videos" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "videos_update_own" ON "videos" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "videos_delete_own" ON "videos" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);