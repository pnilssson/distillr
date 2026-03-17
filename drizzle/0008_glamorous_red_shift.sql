ALTER TABLE "videos" DROP CONSTRAINT "videos_library_video_uniq";--> statement-breakpoint
ALTER TABLE "video_chunks" ALTER COLUMN "start_seconds" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "video_chunks" ALTER COLUMN "end_seconds" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "content_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_library_video_uniq" UNIQUE("library_id","content_type","youtube_video_id");