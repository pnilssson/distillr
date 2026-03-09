import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { loginEmailSchema } from "@/lib/validation/auth";
import { env } from "@/server/core/env";

export async function POST(request: Request) {
  const payload = await request.json();
  const parse = loginEmailSchema.safeParse(payload);

  if (!parse.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const requestUrl = new URL(request.url);
  const { error } = await supabase.auth.signInWithOtp({
    email: parse.data.email,
    options: {
      emailRedirectTo: `${requestUrl.origin}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Check your inbox for the magic link." });
}
