import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

const SIGNUP_TRACKED_AT_METADATA_KEY = "distillr_signup_tracked_at";

export async function markSignupTrackedOnFirstAuth(userId: string): Promise<boolean> {
  const signupTrackedAt = new Date().toISOString();

  const result = await db.execute(sql`
    update auth.users
    set raw_app_meta_data = jsonb_set(
      coalesce(raw_app_meta_data, '{}'::jsonb),
      '{distillr_signup_tracked_at}',
      to_jsonb(${signupTrackedAt}::text),
      true
    )
    where id = ${userId}::uuid
      and not (coalesce(raw_app_meta_data, '{}'::jsonb) ? ${SIGNUP_TRACKED_AT_METADATA_KEY})
    returning id
  `);

  return result.length > 0;
}
