"use client";

import { useState } from "react";
import { Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AddSourceDialog } from "@/features/sources/AddSourceDialog";

type EmptyLibraryStateProps = {
  libraryId: string;
};

export function EmptyLibraryState({ libraryId }: EmptyLibraryStateProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="py-24 text-center">
        <Video size={32} className="mx-auto text-muted-foreground/40" />
        <h1 className="mt-4 text-lg font-semibold">Add your first source</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add YouTube channels, playlists, or videos and chat across all of them.
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
          Add source
        </Button>
      </div>

      <AddSourceDialog
        libraryId={libraryId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
