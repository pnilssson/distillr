import { NextResponse } from "next/server";

import { loginEmailSchema } from "@/lib/validation/auth";
import { createSupabaseServerClient } from "@/server/core/supabase/server";

export async function POST(request: Request) {
  const payload = await request.json();
  const parse = loginEmailSchema.safeParse(payload);

  if (!parse.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
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
