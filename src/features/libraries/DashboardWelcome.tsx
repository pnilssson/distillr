"use client";

import { useEffect, useState } from "react";
import { Library } from "lucide-react";
import posthog from "posthog-js";

import { Button } from "@/components/ui/button";
import { NewLibraryDialog } from "@/features/libraries/NewLibraryDialog";

type DashboardWelcomeProps = {
  hasLibraries: boolean;
  userId: string;
};

export function DashboardWelcome({ hasLibraries, userId }: DashboardWelcomeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    posthog.identify(userId);
  }, [userId]);

  if (hasLibraries) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Select a library from the sidebar to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="py-24 text-center">
        <Library size={32} className="mx-auto text-muted-foreground/40" />
        <h1 className="mt-4 text-lg font-semibold">Start your first library</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Collect channels, playlists, or videos and chat across all of them.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Research a YouTube channel
          </span>
          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Follow a creator
          </span>
          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Mine a playlist
          </span>
        </div>
        <Button className="mt-8" onClick={() => setDialogOpen(true)}>
          New library
        </Button>
      </div>

      <NewLibraryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
