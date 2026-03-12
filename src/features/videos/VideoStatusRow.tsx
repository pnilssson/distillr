"use client";

import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LibraryVideoProgressItem } from "@/features/videos/types";

type VideoStatusRowProps = {
  video: LibraryVideoProgressItem;
};

type StatusMeta = {
  label: string;
  icon: typeof Clock3;
  badgeClassName: string;
  iconClassName: string;
};

const STATUS_META: Record<LibraryVideoProgressItem["status"], StatusMeta> = {
  pending: {
    label: "Queued",
    icon: Clock3,
    badgeClassName: "bg-muted text-muted-foreground",
    iconClassName: "text-muted-foreground",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    badgeClassName: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    iconClassName: "text-sky-600",
  },
  ready: {
    label: "Ready",
    icon: CheckCircle2,
    badgeClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    iconClassName: "text-emerald-600",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    badgeClassName: "bg-destructive/10 text-destructive",
    iconClassName: "text-destructive",
  },
};

export function VideoStatusRow({ video }: VideoStatusRowProps) {
  const meta = STATUS_META[video.status];
  const Icon = meta.icon;

  return (
    <div role="listitem" className="border-b px-3 py-2.5 last:border-b-0">
      <div className="flex items-start gap-2.5">
        <Icon
          size={16}
          className={cn(
            "mt-0.5 shrink-0",
            meta.iconClassName,
            video.status === "processing" && "animate-spin",
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-5" title={video.title}>
            {video.title}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={video.channelName}>
            {video.channelName}
          </p>
          {video.status === "failed" && video.failureReason ? (
            <p className="mt-1 text-xs text-muted-foreground">{video.failureReason}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "inline-flex h-5 shrink-0 items-center justify-center rounded-4xl px-2 py-0.5 text-xs font-medium",
            meta.badgeClassName,
          )}
        >
          {meta.label}
        </span>
      </div>
    </div>
  );
}
