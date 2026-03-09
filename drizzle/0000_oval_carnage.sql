CREATE TABLE "libraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "libraries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "libraries_user_id_idx" ON "libraries" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "libraries_user_id_name_idx" ON "libraries" USING btree ("user_id","name");--> statement-breakpoint
CREATE POLICY "libraries_select_own" ON "libraries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "libraries_insert_own" ON "libraries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "libraries_update_own" ON "libraries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "libraries_delete_own" ON "libraries" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = user_id);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER libraries_set_updated_at
  BEFORE UPDATE ON "libraries"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();