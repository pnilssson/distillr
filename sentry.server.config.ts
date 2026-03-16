// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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
