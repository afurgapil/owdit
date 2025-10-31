// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://17f87650d19b6dfb76931e8f68aa09e4@o4510277157715968.ingest.de.sentry.io/4510277159026768",

    // Optimized sampling - reduce performance impact
    tracesSampleRate: 0.1, // 10% of transactions (was 100%)

    // Selective logging for better performance
    enableLogs: false, // Disable automatic logs

    // Privacy & Performance
    sendDefaultPii: false, // Don't send PII

    // Performance optimizations
    beforeSend(event) {
      // Filter out non-critical errors
      if (event.level === "info" || event.level === "debug") {
        return null;
      }
      return event;
    },

    // Reduce network overhead
    maxBreadcrumbs: 30, // Default is 100
  });
}
