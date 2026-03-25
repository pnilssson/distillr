import { env } from "@/server/core/env";

const appBaseUrl = new URL(env.NEXT_PUBLIC_APP_URL);

export function getAppBaseUrl(): URL {
  return appBaseUrl;
}

export function getAppUrl(pathname = "/"): string {
  return new URL(pathname, appBaseUrl).toString();
}
