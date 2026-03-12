import "server-only";

import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getCurrentUserUncached } from "@/server/core/auth/user";
import { createApiErrorResponse } from "@/server/core/http/api-errors";

type ApiAuthContext = {
  user: User;
};

type RouteContextLike = {
  params: Promise<unknown>;
};

type ApiAuthHandler<TContext extends object = RouteContextLike> = (
  request: Request,
  context: TContext & ApiAuthContext,
) => Promise<Response>;

export function withApiAuth<TContext extends object = RouteContextLike>(
  handler: ApiAuthHandler<TContext>,
) {
  return async (request: Request, context: RouteContextLike): Promise<Response> => {
    try {
      const user = await getCurrentUserUncached();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return await handler(request, {
        ...(context as TContext),
        user,
      });
    } catch (error) {
      return createApiErrorResponse(error);
    }
  };
}
