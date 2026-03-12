"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, Loader2, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { VideoStatusRow } from "@/features/videos/VideoStatusRow";
import { useLibraryVideos } from "@/features/videos/useLibraryVideos";

type IngestionStatusPillProps = {
  libraryId: string;
};

export function IngestionStatusPill({ libraryId }: IngestionStatusPillProps) {
  const videosQuery = useLibraryVideos(libraryId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const progress = videosQuery.data;
  const counts = progress?.counts;
  const hasInFlight = progress?.hasInFlight ?? false;
  const isProcessing = progress?.isProcessing ?? false;

  const pendingCount = counts?.pending ?? 0;
  const processingCount = counts?.processing ?? 0;
  const readyCount = counts?.ready ?? 0;
  const failedCount = counts?.failed ?? 0;
  const totalCount = counts?.total ?? 0;

  const isActive = hasInFlight || isProcessing;
  const hasFailures = failedCount > 0;
  const canExpand = totalCount > 0;
  const shouldRender =
    !isDismissed && (isActive || hasFailures || totalCount > 0);
  const prevIsActiveRef = useRef(false);
  const prevTotalCountRef = useRef(0);

  const shouldAutoClose =
    !isActive && !hasFailures && readyCount === totalCount && totalCount > 0;

  useEffect(() => {
    if (!shouldAutoClose) return;
    const id = setTimeout(() => setIsDismissed(true), 3200);
    return () => clearTimeout(id);
  }, [shouldAutoClose]);

  useEffect(() => {
    const becameActive = !prevIsActiveRef.current && isActive;
    const totalIncreased = totalCount > prevTotalCountRef.current;

    if (isDismissed && (becameActive || totalIncreased)) {
      setIsDismissed(false);
    }

    prevIsActiveRef.current = isActive;
    prevTotalCountRef.current = totalCount;
  }, [isDismissed, isActive, totalCount]);

  if (!shouldRender) {
    return null;
  }

  const summaryText = getSummaryText({
    isProcessing,
    hasInFlight,
    pendingCount,
    processingCount,
    readyCount,
    failedCount,
  });

  const statusIcon = getStatusIcon({
    isActive,
    hasFailures,
  });

  const StatusIcon = statusIcon.icon;
  const panelId = `video-ingestion-status-panel-${libraryId}`;
  const showScrollFade = (progress?.videos.length ?? 0) > 4;

  return (
    <div className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+3.25rem)] z-40 w-[min(92vw,25rem)] -translate-x-1/2 md:top-[calc(env(safe-area-inset-top)+1rem)]">
      <AnimatePresence initial={false}>
        <motion.div
          key="ingestion-status"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pointer-events-auto"
        >
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {summaryText}
          </span>

          <div className="relative overflow-hidden rounded-full border border-border bg-card">
            <div className="flex h-9 items-center gap-1.5 px-1.5">
              <button
                type="button"
                className="relative flex min-w-0 flex-1 items-center gap-2 rounded-full px-2 py-0.5 text-left"
                onClick={() => {
                  if (!canExpand) {
                    return;
                  }

                  setIsExpanded((value) => !value);
                }}
                aria-expanded={canExpand ? isExpanded : undefined}
                aria-controls={canExpand ? panelId : undefined}
                aria-label={
                  canExpand ? "Toggle ingestion details" : "Ingestion status"
                }
              >
                <StatusIcon
                  size={16}
                  className={cn(
                    "shrink-0",
                    statusIcon.className,
                    statusIcon.isSpinning && "animate-spin",
                  )}
                  aria-hidden="true"
                />

                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {summaryText}
                </span>

                {canExpand ? (
                  <ChevronDown
                    size={15}
                    className={cn(
                      "shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setIsDismissed(true);
                }}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close ingestion status"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>

          </div>

          <AnimatePresence>
            {canExpand && isExpanded ? (
              <motion.div
                className="relative mt-2"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <div
                  id={panelId}
                  role="list"
                  className="max-h-80 overflow-y-auto rounded-2xl border border-border bg-card"
                >
                  {progress?.videos.map((video) => (
                    <VideoStatusRow key={video.id} video={video} />
                  ))}
                </div>

                {showScrollFade ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-2xl bg-gradient-to-t from-card to-transparent" />
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function getSummaryText({
  isProcessing,
  hasInFlight,
  pendingCount,
  processingCount,
  readyCount,
  failedCount,
}: {
  isProcessing: boolean;
  hasInFlight: boolean;
  pendingCount: number;
  processingCount: number;
  readyCount: number;
  failedCount: number;
}) {
  if (isProcessing && failedCount === 0) {
    return "Preparing videos";
  }

  if (isProcessing && failedCount > 0) {
    return `Preparing - ${failedCount} failed`;
  }

  if (hasInFlight && processingCount > 0 && failedCount > 0) {
    return `${processingCount} processing - ${failedCount} failed - ${readyCount} ready`;
  }

  if (hasInFlight && processingCount > 0) {
    return `${processingCount} processing - ${readyCount} ready`;
  }

  if (pendingCount > 0 && failedCount > 0) {
    return `${pendingCount} queued - ${failedCount} failed - ${readyCount} ready`;
  }

  if (pendingCount > 0) {
    return `${pendingCount} queued - ${readyCount} ready`;
  }

  if (failedCount > 0) {
    return `${failedCount} failed - ${readyCount} ready`;
  }

  return "All videos ready";
}

function getStatusIcon({
  isActive,
  hasFailures,
}: {
  isActive: boolean;
  hasFailures: boolean;
}) {
  if (isActive) {
    return {
      icon: Loader2,
      className: "text-primary",
      isSpinning: true,
    };
  }

  if (hasFailures) {
    return {
      icon: XCircle,
      className: "text-destructive",
      isSpinning: false,
    };
  }

  return {
    icon: CheckCircle2,
    className: "text-emerald-600",
    isSpinning: false,
  };
}
