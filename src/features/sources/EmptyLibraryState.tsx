"use client";

import { useState } from "react";
import { Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CenteredSpinner } from "@/components/CenteredSpinner";
import { AddSourceDialog } from "@/features/sources/AddSourceDialog";
import { useSources } from "@/features/sources/useSources";
import { useLibraryVideos } from "@/features/videos/useLibraryVideos";

type EmptyLibraryStateProps = {
  libraryId: string;
};

export function EmptyLibraryState({ libraryId }: EmptyLibraryStateProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const sourcesQuery = useSources(libraryId);
  const videosQuery = useLibraryVideos(libraryId);
  const sources = sourcesQuery.data ?? [];
  const videosData = videosQuery.data;
  const hasVideos = (videosData?.counts.total ?? 0) > 0;
  const readyVideos = videosData?.counts.ready ?? 0;

  if (sourcesQuery.isPending) {
    return <CenteredSpinner label="Loading sources…" className="py-24" />;
  }

  if (sources.length > 0) {
    if (!hasVideos && (videosData?.isProcessing || videosQuery.isPending)) {
      return <CenteredSpinner label="Preparing videos…" className="py-24" />;
    }

    if (!hasVideos) {
      return (
        <>
          <div className="mx-auto max-w-sm px-6 py-24 text-center">
            <Video size={32} className="mx-auto text-muted-foreground/40" />
            <h1 className="mt-4 text-lg font-semibold">No videos found yet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We could not find videos to ingest from your current sources. Try adding another source.
            </p>
            <Button className="mt-8" onClick={() => setDialogOpen(true)}>
              Add another source
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

    if (readyVideos === 0) {
      if (videosData?.isProcessing || videosData?.hasInFlight || videosQuery.isPending) {
        return <CenteredSpinner label="Preparing videos…" className="py-24" />;
      }

      return (
        <>
          <div className="mx-auto max-w-sm px-6 py-24 text-center">
            <Video size={32} className="mx-auto text-muted-foreground/40" />
            <h1 className="mt-4 text-lg font-semibold">No ready videos yet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Videos are still being prepared or could not be processed. Add another source to keep building your
              library.
            </p>
            <Button className="mt-8" onClick={() => setDialogOpen(true)}>
              Add another source
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

    return null;
  }

  return (
    <>
      <div className="mx-auto max-w-sm px-6 py-24 text-center">
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
