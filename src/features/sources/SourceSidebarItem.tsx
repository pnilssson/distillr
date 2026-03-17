"use client";

import { List, User, Video } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { SourceListItem } from "./types";

const SOURCE_TYPE_ICONS = {
  youtube_video: Video,
  youtube_playlist: List,
  youtube_channel: User,
} as const;

type Props = {
  source: SourceListItem;
  onSelect: (sourceId: string) => void;
};

export function getSourceLabel(source: SourceListItem): string {
  if (source.channelName && source.title) {
    return `${source.channelName} - ${source.title}`;
  }

  if (source.channelName) {
    return source.channelName;
  }

  return source.url;
}

export function SourceSidebarItem({ source, onSelect }: Props) {
  const Icon = SOURCE_TYPE_ICONS[source.sourceType] ?? Video;
  const label = getSourceLabel(source);
  const isResolvingName = source.status === "processing" && !source.channelName && !source.title;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="gap-2"
        onClick={() => onSelect(source.id)}
        aria-label={`View details for ${label}`}
        title={label}
      >
        <Icon size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        {isResolvingName ? (
          <Skeleton className="h-3 w-28" aria-hidden="true" />
        ) : (
          <span className="truncate text-xs">{label}</span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
