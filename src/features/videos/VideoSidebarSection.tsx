"use client";

import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { VideoDetailsDialog } from "@/features/videos/VideoDetailsDialog";
import { VideoSidebarItem } from "@/features/videos/VideoSidebarItem";
import { useLibraryVideos } from "@/features/videos/useLibraryVideos";

type VideoSidebarSectionProps = {
  libraryId: string;
};

export function VideoSidebarSection({ libraryId }: VideoSidebarSectionProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const videosQuery = useLibraryVideos(libraryId);
  const videos = videosQuery.data?.videos ?? [];
  const selectedVideo = selectedVideoId
    ? (videos.find((video) => video.id === selectedVideoId) ?? null)
    : null;
  const isPreparing = (videosQuery.data?.isProcessing ?? false) && videos.length === 0;

  return (
    <>
      <SidebarGroup className="shrink-0 group-data-[collapsible=icon]:hidden pt-0">
        <SidebarGroupLabel>
          Videos
          {!videosQuery.isPending ? (
            <span className="ml-1.5 tabular-nums text-muted-foreground/60">{videos.length}</span>
          ) : null}
        </SidebarGroupLabel>
        <div className="max-h-40 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
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
                  <VideoSidebarItem key={video.id} video={video} onSelect={setSelectedVideoId} />
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
        </div>
      </SidebarGroup>

      <VideoDetailsDialog
        video={selectedVideo}
        open={Boolean(selectedVideoId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVideoId(null);
          }
        }}
      />
    </>
  );
}
