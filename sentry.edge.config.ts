// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://fb48c176663a73a4cccd20c24618b4d7@o4508629590081536.ingest.de.sentry.io/4511027373080656",

  // sendDefaultPii is intentionally omitted (defaults to false).
  // Sending PII automatically (IP, headers) is not required for error monitoring
  // and conflicts with GDPR data minimisation principles. To associate errors with
  // a specific user for debugging, call Sentry.setUser({ id }) explicitly in
  // authenticated contexts instead.
});
