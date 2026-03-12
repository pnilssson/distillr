ALTER TABLE "sources" ALTER COLUMN "source_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ALTER COLUMN "status" SET DEFAULT 'processing';