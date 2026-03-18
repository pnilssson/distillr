"use client";

import { useState } from "react";
import { Library } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CenteredSpinner } from "@/components/CenteredSpinner";
import { NewLibraryDialog } from "@/features/libraries/NewLibraryDialog";
import { useLibraries } from "@/features/libraries/useLibraries";

export function EmptyDashboardState() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const librariesQuery = useLibraries();
  const hasLibraries = (librariesQuery.data?.length ?? 0) > 0;

  if (librariesQuery.isPending) {
    return <CenteredSpinner label="Loading libraries" className="py-24" />;
  }

  if (hasLibraries) {
    return null;
  }

  return (
    <>
      <div className="px-6 py-24 text-center max-w-sm mx-auto">
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
            Distill a playlist
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
