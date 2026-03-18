import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { ensurePolarCustomerProvisioned } from "@/server/billing/polar/customers";
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      try {
        await ensurePolarCustomerProvisioned({
          userId: user.id,
          email: user.email ?? null,
          name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            area: "billing.provision_callback",
          },
          extra: {
            userId: user.id,
          },
        });
      }
    }
  }

  const redirectPath = isSafeNextPath(nextPath) ? nextPath : DEFAULT_REDIRECT_PATH;

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
