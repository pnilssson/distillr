"use client";

import { List, MoreHorizontal, Trash2, User, Video } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { SourceListItem } from "./types";

const SOURCE_TYPE_ICONS = {
  video: Video,
  playlist: List,
  channel: User,
} as const;

type Props = {
  source: SourceListItem;
  onDelete?: (source: SourceListItem) => void;
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

export function SourceSidebarItem({ source, onDelete }: Props) {
  const Icon = SOURCE_TYPE_ICONS[source.sourceType] ?? Video;
  const label = getSourceLabel(source);
  const isResolvingName = source.status === "processing" && !source.channelName && !source.title;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className="gap-2">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
        >
          <Icon size={14} className="shrink-0 text-muted-foreground" />
          {isResolvingName ? (
            <Skeleton className="h-3 w-28" aria-hidden="true" />
          ) : (
            <span className="truncate text-xs">{label}</span>
          )}
        </a>
      </SidebarMenuButton>

      {onDelete ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover aria-label={`Options for ${label}`}>
              <MoreHorizontal size={14} />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="min-w-40">
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => onDelete(source)}
            >
              <Trash2 size={14} />
              Delete source
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </SidebarMenuItem>
  );
}
