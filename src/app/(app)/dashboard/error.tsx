"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardErrorProps = {
  reset: () => void;
};

export default function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>We could not load your libraries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please try again. If this keeps happening, check your Supabase
            connection and migration state.
          </p>
          <Button onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </main>
  );
}
