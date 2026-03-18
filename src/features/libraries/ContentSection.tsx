"use client";

import { useState } from "react";
import { Clock, ExternalLink, Loader2, XCircle } from "lucide-react";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ContentType } from "@/lib/sources/types";
import type { LibraryVideoProgressItem, LibraryVideosProgress } from "@/features/videos/types";

function getContentUrl(contentType: ContentType, externalId: string): string | null {
  if (contentType === "youtube_video") {
    return `https://www.youtube.com/watch?v=${externalId}`;
  }
  return null;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const INITIAL_VISIBLE_COUNT = 50;

type StatusChipProps = {
  status: LibraryVideoProgressItem["status"];
  failureReason: string | null;
};

function StatusChip({ status, failureReason }: StatusChipProps) {
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock size={11} aria-hidden="true" />
        Queued
      </span>
    );
  }

  if (status === "processing") {
    return (
      <span className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
        Processing
      </span>
    );
  }

  if (status === "ready") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Ready
      </span>
    );
  }

  // failed
  if (failureReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex cursor-default items-center gap-1 text-xs text-destructive">
            <XCircle size={11} aria-hidden="true" />
            Failed
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {failureReason}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-destructive">
      <XCircle size={11} aria-hidden="true" />
      Failed
    </span>
  );
}

type VideoRowProps = {
  video: LibraryVideoProgressItem;
};

function VideoRow({ video }: VideoRowProps) {
  const publishedDate = video.publishedAt ? timeAgo(video.publishedAt) : null;
  const contentUrl = getContentUrl(video.contentType, video.externalId);

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
      {/* Thumbnail */}
      {video.thumbnailUrl ? (
        <Image
          src={video.thumbnailUrl}
          alt=""
          aria-hidden="true"
          width={50}
          height={28}
          className="h-[28px] w-[50px] shrink-0 rounded object-cover"
          unoptimized
        />
      ) : (
        <div className="h-[28px] w-[50px] shrink-0 rounded bg-muted" aria-hidden="true" />
      )}

      {/* Title */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-snug" title={video.title}>
          {video.title || video.externalId}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {video.channelName ? (
            <span className="truncate text-xs text-muted-foreground">{video.channelName}</span>
          ) : null}
          {publishedDate && video.channelName ? (
            <span className="text-muted-foreground/40" aria-hidden="true">·</span>
          ) : null}
          {publishedDate ? (
            <span className="shrink-0 text-xs text-muted-foreground">{publishedDate}</span>
          ) : null}
        </div>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <StatusChip status={video.status} failureReason={video.failureReason} />
      </div>

      {/* External link */}
      {contentUrl ? (
        <a
          href={contentUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${video.title}`}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

type Props = {
  videosData: LibraryVideosProgress | undefined;
  isLoading: boolean;
};

export function ContentSection({ videosData, isLoading }: Props) {
  const [showAll, setShowAll] = useState(false);

  const videos = videosData?.videos ?? [];
  const counts = videosData?.counts;
  const isActivelyProcessing = videosData?.isProcessing || videosData?.hasInFlight;

  const visibleVideos =
    showAll || videos.length <= INITIAL_VISIBLE_COUNT
      ? videos
      : videos.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = videos.length - visibleVideos.length;

  return (
    <section aria-labelledby="content-heading">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 id="content-heading" className="text-sm font-semibold">
            Content
          </h2>
          {!isLoading && videos.length > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
              {counts?.total ?? videos.length}
            </span>
          ) : null}
        </div>

        {counts && (counts.ready > 0 || counts.failed > 0) ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {counts.ready > 0 ? (
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {counts.ready} ready
              </span>
            ) : null}
            {counts.failed > 0 ? (
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-destructive" aria-hidden="true" />
                {counts.failed} failed
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card">
          {isLoading ? (
            <div className="divide-y">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <Skeleton className="h-[28px] w-[50px] shrink-0 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-14" />
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {isActivelyProcessing
                  ? "Videos will appear here as they are processed."
                  : "No videos found. Add a source to start building your library."}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {visibleVideos.map((video) => (
                  <VideoRow key={video.id} video={video} />
                ))}
              </div>

              {hiddenCount > 0 ? (
                <div className="border-t px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAll(true)}
                  >
                    Show {hiddenCount} more
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
    </section>
  );
}
