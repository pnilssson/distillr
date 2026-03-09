"use client";

import { useEffect, useState } from "react";

import posthog from "posthog-js";

import { CreateLibraryForm } from "@/features/libraries/CreateLibraryForm";
import { EmptyLibrariesState } from "@/features/libraries/EmptyLibrariesState";
import { LibraryList } from "@/features/libraries/LibraryList";
import { LibraryListItem } from "@/features/libraries/types";

type LibrariesDashboardProps = {
  initialLibraries: LibraryListItem[];
  currentUserId: string;
};

export function LibrariesDashboard({
  initialLibraries,
  currentUserId,
}: LibrariesDashboardProps) {
  const [libraries, setLibraries] = useState(initialLibraries);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    posthog.identify(currentUserId);
  }, [currentUserId]);

  function onLibraryCreated(library: LibraryListItem) {
    setLibraries((current) => [library, ...current]);
  }

  async function onDeleteLibrary(libraryId: string) {
    setDeleteError(null);

    const response = await fetch(`/api/libraries/${libraryId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setDeleteError(payload.error ?? "Unable to delete library.");
      return;
    }

    setLibraries((current) => current.filter((library) => library.id !== libraryId));
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Your libraries</h1>
        <p className="text-sm text-muted-foreground">
          Build your second brain by collecting the videos that matter.
        </p>
      </header>

      {libraries.length === 0 ? (
        <EmptyLibrariesState onCreated={onLibraryCreated} />
      ) : (
        <div className="space-y-6">
          <CreateLibraryForm onCreated={onLibraryCreated} />
          {deleteError ? (
            <p className="text-sm text-destructive">{deleteError}</p>
          ) : null}
          <LibraryList libraries={libraries} onDelete={onDeleteLibrary} />
        </div>
      )}
    </section>
  );
}
