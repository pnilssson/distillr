"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        area: "dashboard.route_error",
      },
    });
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold tracking-tight">Could not load home</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while loading your dashboard.
        </p>
        <Button
          className="mt-5"
          onClick={() => {
            reset();
          }}
        >
          Try again
        </Button>
      </section>
    </main>
  );
}
