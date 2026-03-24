CREATE TABLE "source_content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_content_items_source_item_uniq" UNIQUE("source_id","content_item_id")
);
--> statement-breakpoint
ALTER TABLE "source_content_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_items" DROP CONSTRAINT "content_items_source_id_sources_id_fk";
--> statement-breakpoint
DROP INDEX "content_items_source_id_idx";--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "auto_sync_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "sync_cursor" jsonb;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "next_sync_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "last_sync_error_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "consecutive_sync_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "source_content_items" ADD CONSTRAINT "source_content_items_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_content_items" ADD CONSTRAINT "source_content_items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_content_items" ADD CONSTRAINT "source_content_items_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_content_items_library_id_idx" ON "source_content_items" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "source_content_items_source_id_idx" ON "source_content_items" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "source_content_items_content_item_id_idx" ON "source_content_items" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "source_content_items_user_id_idx" ON "source_content_items" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "content_items" DROP COLUMN "source_id";--> statement-breakpoint
CREATE POLICY "source_content_items_select_own" ON "source_content_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "source_content_items_insert_own" ON "source_content_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "source_content_items_update_own" ON "source_content_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "source_content_items_delete_own" ON "source_content_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);