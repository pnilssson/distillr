import "server-only";

import { env } from "@/server/core/env";

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function withProtocol(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function resolveAppUrl() {
  if (env.NEXT_PUBLIC_APP_URL) {
    return trimTrailingSlashes(withProtocol(env.NEXT_PUBLIC_APP_URL));
  }
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return trimTrailingSlashes(withProtocol(prod));
  const preview = process.env.VERCEL_URL;
  if (preview) return trimTrailingSlashes(withProtocol(preview));
  return "http://localhost:3000";
}

export const appUrl = resolveAppUrl();
