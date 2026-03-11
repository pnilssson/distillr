"use client";

import { List, User, Video } from "lucide-react";

import {
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
};

export function SourceSidebarItem({ source }: Props) {
  const Icon = SOURCE_TYPE_ICONS[source.sourceType] ?? Video;

  let label: string;
  if (source.channelName && source.title) {
    label = `${source.channelName} - ${source.title}`;
  } else if (source.channelName) {
    label = source.channelName;
  } else {
    label = source.url;
  }

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
          <span className="truncate text-xs">{label}</span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
