"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  List,
  Repeat,
  Trash2,
  User,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { SourceListItem } from "@/features/sources/types";
import { useSetSourceAutoSync } from "@/features/sources/useSetSourceAutoSync";
import { useRefreshSource } from "@/features/sources/useRefreshSource";

type SourceDetailsDialogProps = {
  libraryId: string;
  source: SourceListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (source: SourceListItem) => void;
};

type StatusMeta = {
  label: string;
  variant: "outline" | "destructive";
  className?: string;
};

const STATUS_META: Record<SourceListItem["status"], StatusMeta> = {
  processing: {
    label: "Processing",
    variant: "outline",
    className:
      "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  ready: {
    label: "Ready",
    variant: "outline",
    className:
      "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
  },
};

const SOURCE_TYPE_META: Record<
  SourceListItem["sourceType"],
  { label: string; icon: typeof Video; ctaLabel: string }
> = {
  youtube_video: {
    label: "Video",
    icon: Video,
    ctaLabel: "Go to video",
  },
  youtube_playlist: {
    label: "Playlist",
    icon: List,
    ctaLabel: "Go to playlist",
  },
  youtube_channel: {
    label: "Channel",
    icon: User,
    ctaLabel: "Go to channel",
  },
};

export function SourceDetailsDialog({
  libraryId,
  source,
  open,
  onOpenChange,
  onDelete,
}: SourceDetailsDialogProps) {
  const [copied, setCopied] = useState(false);
  const refreshMutation = useRefreshSource();
  const autoSyncMutation = useSetSourceAutoSync();

  const refreshDisabled = !source || source.status === "processing" || refreshMutation.isPending;
  const supportsAutoSync = source ? source.sourceType !== "youtube_video" : false;

  function copyUrl() {
    if (!source) {
      return;
    }

    navigator.clipboard.writeText(source.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        {source ? (
          <>
            <div className="space-y-4 p-5">
              <SourceTypeIcon sourceType={source.sourceType} />

              <DialogHeader className="space-y-1">
                <DialogTitle className="leading-snug">{getSourceTitle(source)}</DialogTitle>
                <DialogDescription className="truncate">{getSourceSubtitle(source)}</DialogDescription>
              </DialogHeader>

              {source.status !== "ready" ? (
                <Badge
                  variant={STATUS_META[source.status].variant}
                  className={STATUS_META[source.status].className}
                >
                  {STATUS_META[source.status].label}
                </Badge>
              ) : null}

              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="outline" size="sm" className="w-full" onClick={copyUrl}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? "Copied!" : "Copy URL"}
                </Button>

                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" />
                    {SOURCE_TYPE_META[source.sourceType].ctaLabel}
                  </a>
                </Button>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <MetaCell
                  label="Source type"
                  value={SOURCE_TYPE_META[source.sourceType].label}
                />
                <MetaCell label="Added to library" value={formatDateTime(source.createdAt)} />
                {supportsAutoSync ? (
                  <MetaCell
                    label="Auto-sync"
                    value={source.autoSyncEnabled ? "Enabled" : "Disabled"}
                  />
                ) : null}
                {supportsAutoSync ? (
                  <MetaCell
                    label="Last sync"
                    value={source.lastSyncedAt ? formatDateTime(source.lastSyncedAt) : "Never"}
                  />
                ) : null}
              </div>

              {source.status === "failed" ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5"
                >
                  <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle size={14} aria-hidden="true" />
                    Processing failed
                  </p>
                  <p className="mt-1 text-xs text-destructive/90">
                    This source could not be ingested. Try refreshing first, or remove it and add
                    it again.
                  </p>
                </div>
              ) : null}

              <Separator />

              {supportsAutoSync ? (
                <div className="space-y-2.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-3">
                  <p className="text-sm font-medium">Auto-sync</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically check this source for newly published videos.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={autoSyncMutation.isPending}
                    onClick={() => {
                      if (!source) {
                        return;
                      }

                      autoSyncMutation.mutate(
                        {
                          libraryId,
                          sourceId: source.id,
                          enabled: !source.autoSyncEnabled,
                        },
                        {
                          onSuccess: () => {
                            toast.success(source.autoSyncEnabled ? "Auto-sync disabled." : "Auto-sync enabled.");
                          },
                        },
                      );
                    }}
                  >
                    <Repeat aria-hidden="true" />
                    {autoSyncMutation.isPending
                      ? "Updating..."
                      : source.autoSyncEnabled
                        ? "Disable auto-sync"
                        : "Enable auto-sync"}
                  </Button>
                  {autoSyncMutation.isError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {autoSyncMutation.error.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Separator />

              <div className="space-y-2.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-3">
                <p className="text-sm font-medium">Refresh source</p>
                <p className="text-xs text-muted-foreground">
                  Retry previously failed videos and check for newly available videos from this source.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={refreshDisabled}
                  onClick={() => {
                    if (!source) {
                      return;
                    }

                    refreshMutation.mutate(
                      {
                        libraryId,
                        sourceId: source.id,
                      },
                      {
                        onSuccess: () => {
                          toast.success("Source refresh started.");
                        },
                      },
                    );
                  }}
                >
                  {refreshMutation.isPending
                    ? "Refreshing..."
                    : source.status === "processing"
                      ? "Refresh in progress"
                      : "Refresh source"}
                </Button>
                {refreshMutation.isError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {refreshMutation.error.message}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => onDelete(source)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete source
                </Button>

                <DialogClose asChild>
                  <Button variant="default" className="w-full">
                    Close
                  </Button>
                </DialogClose>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SourceTypeIcon({ sourceType }: { sourceType: SourceListItem["sourceType"] }) {
  const Icon = SOURCE_TYPE_META[sourceType].icon;

  return (
    <div className="flex size-9 items-center justify-center rounded-full border border-border bg-muted/60 text-muted-foreground shadow-sm">
      <Icon size={15} aria-hidden="true" />
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm">{value}</p>
    </div>
  );
}

function getSourceTitle(source: SourceListItem): string {
  if (source.title) {
    return source.title;
  }

  if (source.channelName) {
    return source.channelName;
  }

  return source.url;
}

function getSourceSubtitle(source: SourceListItem): string {
  if (source.title && source.channelName) {
    return source.channelName;
  }

  return SOURCE_TYPE_META[source.sourceType].label;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}
