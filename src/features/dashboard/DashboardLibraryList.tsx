"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Library, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewLibraryDialog } from "@/features/libraries/NewLibraryDialog";
import type { DashboardLibraryItem } from "@/features/dashboard/types";

type DashboardLibraryListProps = {
  libraries: DashboardLibraryItem[];
};

export function DashboardLibraryList({ libraries }: DashboardLibraryListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const visibleLibraries = libraries.slice(0, 8);

  return (
    <>
      <section aria-labelledby="dashboard-libraries-heading">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="dashboard-libraries-heading" className="text-sm font-semibold">
              Libraries
            </h2>
            {libraries.length > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                {libraries.length}
              </span>
            ) : null}
          </div>

          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setDialogOpen(true)}
            aria-label="New library"
          >
            <Plus size={12} />
            New library
          </Button>
        </div>

        <div className="rounded-xl border bg-card">
          {visibleLibraries.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">No libraries yet.</p>
            </div>
          ) : (
            <ul role="list" className="divide-y">
              {visibleLibraries.map((library) => {
                const processingCount = library.videoPending + library.videoProcessing;

                return (
                  <li key={library.id}>
                    <Link
                      href={`/library/${library.id}`}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                        <Library size={14} className="text-muted-foreground" aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-snug">{library.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {library.videoTotal} video{library.videoTotal === 1 ? "" : "s"}
                          </span>
                          {library.videoReady > 0 ? (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {library.videoReady} ready
                            </span>
                          ) : null}
                          {processingCount > 0 ? (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                              {processingCount} processing
                            </Badge>
                          ) : null}
                          {library.chatSessionCount > 0 ? (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {library.chatSessionCount} chat{library.chatSessionCount === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <ChevronRight
                        size={14}
                        className="shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {libraries.length > visibleLibraries.length ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            +{libraries.length - visibleLibraries.length} more libraries in the sidebar
          </p>
        ) : null}
      </section>

      <NewLibraryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
