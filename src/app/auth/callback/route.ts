import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/server/core/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectPath = nextPath.startsWith("/") ? nextPath : "/app";

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
