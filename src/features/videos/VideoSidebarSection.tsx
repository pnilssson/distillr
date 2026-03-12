"use client";

import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SidebarMenu } from "@/components/ui/sidebar";
import { VideoDetailsDialog } from "@/features/videos/VideoDetailsDialog";
import { VideoSidebarItem } from "@/features/videos/VideoSidebarItem";
import type { LibraryVideoProgressItem } from "@/features/videos/types";
import { useLibraryVideos } from "@/features/videos/useLibraryVideos";

type VideoSidebarSectionProps = {
  libraryId: string;
};

export function VideoSidebarSection({ libraryId }: VideoSidebarSectionProps) {
  const [selectedVideo, setSelectedVideo] = useState<LibraryVideoProgressItem | null>(null);
  const videosQuery = useLibraryVideos(libraryId);
  const videos = videosQuery.data?.videos ?? [];
  const isPreparing = (videosQuery.data?.isProcessing ?? false) && videos.length === 0;

  return (
    <>
      <section className="pt-2">
        <h3 className="flex h-8 items-center px-2 text-xs font-medium text-muted-foreground">Videos</h3>

        <SidebarMenu>
          {videosQuery.isPending ? (
            <div className="space-y-2 px-2 py-1">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
            </div>
          ) : null}

          {!videosQuery.isPending && videos.length > 0
            ? videos.map((video) => (
                <VideoSidebarItem key={video.id} video={video} onSelect={setSelectedVideo} />
              ))
            : null}

          {!videosQuery.isPending && !videosQuery.isError && isPreparing ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">Preparing videos</p>
          ) : null}

          {!videosQuery.isPending && !videosQuery.isError && !isPreparing && videos.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">No videos yet</p>
          ) : null}

          {videosQuery.isError ? (
            <p className="px-2 py-1 text-xs text-destructive">Could not load videos.</p>
          ) : null}
        </SidebarMenu>
      </section>

      <VideoDetailsDialog
        video={selectedVideo}
        open={Boolean(selectedVideo)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVideo(null);
          }
        }}
      />
    </>
  );
}
