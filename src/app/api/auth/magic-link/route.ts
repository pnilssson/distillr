import { NextResponse } from "next/server";

import { loginEmailSchema } from "@/lib/validation/auth";
import { env } from "@/server/core/env";
import { AppError } from "@/server/core/errors/app-error";
import { createApiErrorResponse } from "@/server/core/http/api-errors";
import { createSupabaseServerClient } from "@/server/core/supabase/server";

export async function POST(request: Request) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new AppError({
        code: "invalid_request_body",
        userMessage: "Invalid email.",
        httpStatus: 400,
      });
    }

    const parse = loginEmailSchema.safeParse(payload);

    if (!parse.success) {
      throw new AppError({
        code: "invalid_email",
        userMessage: "Invalid email.",
        httpStatus: 400,
      });
    }

    const { origin: requestOrigin } = new URL(request.url);
    const appOrigin = env.NEXT_PUBLIC_APP_URL
      ? new URL(env.NEXT_PUBLIC_APP_URL).origin
      : requestOrigin;
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: parse.data.email,
      options: {
        emailRedirectTo: `${appOrigin}/auth/callback`,
      },
    });

    if (error) {
      throw new AppError({
        code: "magic_link_send_failed",
        userMessage: "Could not send magic link. Please try again.",
        httpStatus: 400,
        cause: error,
      });
    }

    return NextResponse.json({ message: "Check your inbox for the magic link." });
  } catch (error) {
    return createApiErrorResponse(error, {
      fallbackMessage: "Could not send magic link. Please try again.",
    });
  }
}
