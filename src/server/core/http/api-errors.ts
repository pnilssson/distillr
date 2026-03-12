import "server-only";

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { isAppError } from "@/server/core/errors/app-error";

type ApiErrorResponseOptions = {
  fallbackMessage?: string;
};

export function createApiErrorResponse(
  error: unknown,
  options: ApiErrorResponseOptions = {},
): Response {
  if (isAppError(error)) {
    if (error.httpStatus >= 500) {
      Sentry.captureException(error.cause ?? error, {
        tags: {
          area: "api.route",
          error_code: error.code,
        },
      });
    }

    return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus });
  }

  Sentry.captureException(error, {
    tags: {
      area: "api.route",
    },
  });

  return NextResponse.json(
    { error: options.fallbackMessage ?? "Could not process this request. Please try again." },
    { status: 500 },
  );
}
