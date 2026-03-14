import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/server/core/supabase/server";

const DEFAULT_REDIRECT_PATH = "/dashboard";

function isSafeNextPath(path: string | null): path is string {
  if (!path) {
    return false;
  }

  return /^\/(?!\/)/.test(path);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectPath = isSafeNextPath(nextPath) ? nextPath : DEFAULT_REDIRECT_PATH;

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
