import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { ensurePolarCustomerProvisioned } from "@/server/billing/polar/customers";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { markSignupTrackedOnFirstAuth } from "@/server/core/auth/lifecycle";
import { createSupabaseServerClient } from "@/server/core/supabase/server";

const DEFAULT_REDIRECT_PATH = "/dashboard";
const AUTH_FAILURE_REDIRECT_PATH = "/login";

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
  let redirectPath = isSafeNextPath(nextPath) ? nextPath : DEFAULT_REDIRECT_PATH;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      Sentry.captureException(exchangeError, {
        tags: {
          area: "auth.callback.exchange_code",
        },
      });
    }

    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError) {
      Sentry.captureException(getUserError, {
        tags: {
          area: "auth.callback.get_user",
        },
      });
      redirectPath = AUTH_FAILURE_REDIRECT_PATH;
    }

    if (user) {
      try {
        const isFirstAuth = await markSignupTrackedOnFirstAuth(user.id);

        if (isFirstAuth) {
          await captureServerEvent(
            user.id,
            "user_signed_up",
            {
              auth_method: "magic_link",
              idempotency_key: `auth_callback:${user.id}:user_signed_up`,
            },
            {
              immediate: true,
            },
          );
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            area: "auth.callback.lifecycle",
          },
          extra: {
            userId: user.id,
          },
        });
      }

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
    } else {
      redirectPath = AUTH_FAILURE_REDIRECT_PATH;
    }
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
