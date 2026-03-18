"use client";

import { useState } from "react";
import {
  List,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Video,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AddSourceDialog } from "@/features/sources/AddSourceDialog";
import { DeleteSourceDialog } from "@/features/sources/DeleteSourceDialog";
import { getSourceLabel } from "@/features/sources/SourceSidebarItem";
import { useRefreshSource } from "@/features/sources/useRefreshSource";
import type { SourceListItem } from "@/features/sources/types";

const SOURCE_TYPE_ICONS = {
  youtube_video: Video,
  youtube_playlist: List,
  youtube_channel: User,
} as const;

const SOURCE_TYPE_LABELS = {
  youtube_video: "Video",
  youtube_playlist: "Playlist",
  youtube_channel: "Channel",
} as const;

type SourceRowProps = {
  source: SourceListItem;
  libraryId: string;
  onDeleteRequest: (source: SourceListItem) => void;
};

function SourceStatusDot({ status }: { status: SourceListItem["status"] }) {
  if (status === "processing") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400">
        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
        Processing
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <XCircle size={11} aria-hidden="true" />
        Failed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      Ready
    </span>
  );
}

function SourceRow({ source, libraryId, onDeleteRequest }: SourceRowProps) {
  const refreshMutation = useRefreshSource();
  const Icon = SOURCE_TYPE_ICONS[source.sourceType] ?? Video;
  const label = getSourceLabel(source);
  const isResolvingName = source.status === "processing" && !source.channelName && !source.title;

  function handleRefresh() {
    refreshMutation.mutate(
      { libraryId, sourceId: source.id },
      {
        onSuccess: () => toast.success("Source refresh queued."),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/50">
      {/* Icon */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
        <Icon size={14} className="text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Label + meta */}
      <div className="min-w-0 flex-1">
        {isResolvingName ? (
          <Skeleton className="h-3.5 w-40" />
        ) : (
          <p className="truncate text-sm font-medium leading-snug" title={label}>
            {label}
          </p>
        )}
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {SOURCE_TYPE_LABELS[source.sourceType]}
          </span>
          <span className="text-muted-foreground/40" aria-hidden="true">·</span>
          <SourceStatusDot status={source.status} />
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Actions for ${label}`}
          >
            <MoreHorizontal size={14} aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw size={13} className="mr-2" aria-hidden="true" />
            Refresh
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDeleteRequest(source)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 size={13} className="mr-2" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type Props = {
  libraryId: string;
  sources: SourceListItem[];
  isLoading: boolean;
};

export function SourcesSection({ libraryId, sources, isLoading }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SourceListItem | null>(null);

  return (
    <section aria-labelledby="sources-heading">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 id="sources-heading" className="text-sm font-semibold">
            Sources
          </h2>
          {!isLoading && sources.length > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
              {sources.length}
            </span>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setAddOpen(true)}
        >
          <Plus size={12} aria-hidden="true" />
          Add source
        </Button>
      </div>

      <div className="rounded-xl border">
        {isLoading ? (
          <div className="divide-y">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-8 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No sources yet.</p>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={13} className="mr-1.5" aria-hidden="true" />
              Add your first source
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                libraryId={libraryId}
                onDeleteRequest={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      <AddSourceDialog
        libraryId={libraryId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      {deleteTarget ? (
        <DeleteSourceDialog
          libraryId={libraryId}
          sourceId={deleteTarget.id}
          sourceLabel={getSourceLabel(deleteTarget)}
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        />
      ) : null}
    </section>
  );
}
