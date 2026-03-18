"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-sm font-medium">
            Libraries
            <span className="ml-1.5 text-muted-foreground/70 tabular-nums">{libraries.length}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setDialogOpen(true)}
            aria-label="New library"
          >
            <Plus size={12} />
            New
          </Button>
        </CardHeader>
        <CardContent className="pb-2 pt-0">
          {visibleLibraries.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">No libraries yet.</p>
          ) : (
            <ul role="list" className="-mx-2 divide-y divide-border">
              {visibleLibraries.map((library) => {
                const processingCount = library.videoPending + library.videoProcessing;

                return (
                  <li key={library.id}>
                    <Link
                      href={`/library/${library.id}`}
                      className="group flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{library.name}</p>
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

          {libraries.length > visibleLibraries.length ? (
            <p className="mt-2 pb-1 text-center text-xs text-muted-foreground">
              +{libraries.length - visibleLibraries.length} more libraries in the sidebar
            </p>
          ) : null}
        </CardContent>
      </Card>

      <NewLibraryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
