"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  CirclePlay,
  Copy,
  ExternalLink,
  User,
} from "lucide-react";

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
import type { LibraryVideoProgressItem } from "@/features/videos/types";

type VideoDetailsDialogProps = {
  video: LibraryVideoProgressItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type StatusMeta = {
  label: string;
  variant: "secondary" | "outline" | "destructive";
  className?: string;
};

const STATUS_META: Record<LibraryVideoProgressItem["status"], StatusMeta> = {
  pending: {
    label: "Queued",
    variant: "secondary",
  },
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

export function VideoDetailsDialog({
  video,
  open,
  onOpenChange,
}: VideoDetailsDialogProps) {
  const [copied, setCopied] = useState(false);
  const youtubeUrl = video ? getYoutubeVideoUrl(video.youtubeVideoId) : "";

  function copyUrl() {
    navigator.clipboard.writeText(youtubeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        {video ? (
          <>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-video w-full overflow-hidden bg-muted"
              aria-label={`Watch '${video.title}' on YouTube`}
            >
              {video.thumbnailUrl ? (
                <Image
                  src={video.thumbnailUrl}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 512px, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <CirclePlay size={40} aria-hidden="true" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                <div className="rounded-full border border-white/30 bg-black/40 p-3 text-white shadow-lg">
                  <CirclePlay size={28} aria-hidden="true" />
                </div>
              </div>
            </a>

            <div className="space-y-4 p-5">
              <DialogHeader className="space-y-1">
                <DialogTitle className="leading-snug">{video.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-1.5">
                  <User size={13} aria-hidden="true" />
                  <span className="truncate">{video.channelName}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge
                  variant={STATUS_META[video.status].variant}
                  className={STATUS_META[video.status].className}
                >
                  {STATUS_META[video.status].label}
                </Badge>

                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={copyUrl}>
                    {copied ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Copy aria-hidden="true" />
                    )}
                    {copied ? "Copied!" : "Copy URL"}
                  </Button>

                  <Button variant="outline" size="sm" asChild>
                    <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink aria-hidden="true" />
                      Watch on YouTube
                    </a>
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <MetaCell label="Published" value={formatDateTime(video.publishedAt)} />
                <MetaCell label="Added to library" value={formatDateTime(video.createdAt)} />
              </div>

              {video.status === "failed" && video.failureReason ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5"
                >
                  <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle size={14} aria-hidden="true" />
                    Processing failed
                  </p>
                  <p className="mt-1 break-words text-xs text-destructive/90">
                    {video.failureReason}
                  </p>
                </div>
              ) : null}

              <Separator />

              <DialogClose asChild>
                <Button variant="default" className="w-full">
                  Close
                </Button>
              </DialogClose>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MetaCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm">{value}</p>
    </div>
  );
}

function getYoutubeVideoUrl(youtubeVideoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}
