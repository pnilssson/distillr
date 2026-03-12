ALTER TABLE "sources" ADD COLUMN "source_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sources_library_id_source_key_idx" ON "sources" USING btree ("library_id","source_key");