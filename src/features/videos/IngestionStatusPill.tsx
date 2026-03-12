"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLibraryVideos } from "@/features/videos/useLibraryVideos";
import { VideoStatusRow } from "@/features/videos/VideoStatusRow";

type IngestionStatusPillProps = {
  libraryId: string;
};

const DONE_STATE_DURATION_MS = 2000;

export function IngestionStatusPill({ libraryId }: IngestionStatusPillProps) {
  const videosQuery = useLibraryVideos(libraryId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDoneState, setShowDoneState] = useState(false);
  const hasBeenActiveRef = useRef(false);

  const progress = videosQuery.data;
  const counts = progress?.counts;
  const hasInFlight = progress?.hasInFlight ?? false;
  const isProcessing = progress?.isProcessing ?? false;
  const hasVideos = (counts?.total ?? 0) > 0;
  const shouldShowActive = hasInFlight || isProcessing;
  const isDoneVisible = showDoneState && !shouldShowActive;
  const canExpand = hasVideos && (shouldShowActive || isDoneVisible);

  useEffect(() => {
    if (!progress) {
      return;
    }

    if (shouldShowActive) {
      hasBeenActiveRef.current = true;
      return;
    }

    if (!hasBeenActiveRef.current) {
      return;
    }

    if ((counts?.total ?? 0) === 0) {
      hasBeenActiveRef.current = false;
      return;
    }

    const enterDoneTimeoutId = window.setTimeout(() => {
      setIsExpanded(false);
      setShowDoneState(true);
    }, 0);

    const timeoutId = window.setTimeout(() => {
      setShowDoneState(false);
      hasBeenActiveRef.current = false;
    }, DONE_STATE_DURATION_MS);

    return () => {
      window.clearTimeout(enterDoneTimeoutId);
      window.clearTimeout(timeoutId);
    };
  }, [counts?.total, progress, shouldShowActive]);

  const progressPercent = useMemo(() => {
    if (isDoneVisible) {
      return 100;
    }

    if (!counts) {
      return 0;
    }

    if (counts.total === 0) {
      return isProcessing ? 12 : 0;
    }

    return Math.max(0, Math.min(100, Math.round((counts.ready / counts.total) * 100)));
  }, [counts, isDoneVisible, isProcessing]);

  if (!shouldShowActive && !isDoneVisible) {
    return null;
  }

  const summaryText = getSummaryText({
    showDoneState: isDoneVisible,
    hasInFlight,
    isProcessing,
    processingCount: counts?.processing ?? 0,
    pendingCount: counts?.pending ?? 0,
    readyCount: counts?.ready ?? 0,
  });

  const panelId = `video-ingestion-status-panel-${libraryId}`;

  return (
    <div className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+3.25rem)] z-40 w-[min(92vw,25rem)] -translate-x-1/2 md:top-[calc(env(safe-area-inset-top)+1rem)]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDoneVisible ? "done" : "active"}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pointer-events-auto"
        >
          <div role="status" aria-live="polite" aria-atomic="true" className="rounded-full border bg-background/95 shadow-md backdrop-blur-sm">
            <button
              type="button"
              className="relative flex h-9 w-full items-center gap-2 overflow-hidden rounded-full px-3 text-left"
              onClick={() => {
                if (!canExpand) {
                  return;
                }

                setIsExpanded((value) => !value);
              }}
              aria-expanded={canExpand ? isExpanded : undefined}
              aria-controls={canExpand ? panelId : undefined}
              aria-label={canExpand ? "Toggle ingestion details" : "Ingestion status"}
            >
              {isDoneVisible ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <Loader2
                  size={16}
                  className={cn(
                    "shrink-0 text-sky-600",
                    (hasInFlight || isProcessing) && "animate-spin",
                  )}
                  aria-hidden="true"
                />
              )}

              <span className="min-w-0 flex-1 truncate text-sm font-medium">{summaryText}</span>

              {canExpand ? (
                <ChevronDown
                  size={15}
                  className={cn("shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
                  aria-hidden="true"
                />
              ) : null}

              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-muted/50">
                <motion.div
                  className={cn("h-full bg-primary", isProcessing && !hasVideos && "animate-pulse")}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                />
              </div>
            </button>
          </div>

          <AnimatePresence>
            {canExpand && isExpanded ? (
              <motion.div
                id={panelId}
                role="list"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="mt-2 max-h-80 overflow-y-auto rounded-2xl border bg-background/95 shadow-xl backdrop-blur-sm"
              >
                {progress?.videos.map((video) => <VideoStatusRow key={video.id} video={video} />)}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function getSummaryText({
  showDoneState,
  hasInFlight,
  isProcessing,
  processingCount,
  pendingCount,
  readyCount,
}: {
  showDoneState: boolean;
  hasInFlight: boolean;
  isProcessing: boolean;
  processingCount: number;
  pendingCount: number;
  readyCount: number;
}) {
  if (showDoneState) {
    return "All videos ready";
  }

  if (isProcessing) {
    return "Preparing videos";
  }

  if (hasInFlight && processingCount > 0) {
    return `${processingCount} processing - ${readyCount} ready`;
  }

  return `${pendingCount} queued - ${readyCount} ready`;
}
