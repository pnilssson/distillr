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
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_library_id_idx" ON "chat_messages" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "chat_messages_user_id_idx" ON "chat_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_library_id_idx" ON "chat_sessions" USING btree ("library_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_last_message_at_idx" ON "chat_sessions" USING btree ("last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "chat_messages_select_own" ON "chat_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_messages_insert_own" ON "chat_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_messages_update_own" ON "chat_messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_messages_delete_own" ON "chat_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_sessions_select_own" ON "chat_sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_sessions_insert_own" ON "chat_sessions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_sessions_update_own" ON "chat_sessions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "chat_sessions_delete_own" ON "chat_sessions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);