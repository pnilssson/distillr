import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/server/core/supabase/server";

async function fetchCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export const getCurrentUser = cache(fetchCurrentUser);

export async function getCurrentUserUncached(): Promise<User | null> {
  return fetchCurrentUser();
}

export async function requireUserOrRedirect(path = "/login"): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(path);
  }

  return user;
}
