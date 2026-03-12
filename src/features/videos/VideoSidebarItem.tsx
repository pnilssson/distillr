"use client";

import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { LibraryVideoProgressItem } from "@/features/videos/types";
import { cn } from "@/lib/utils";

type VideoSidebarItemProps = {
  video: LibraryVideoProgressItem;
  onSelect: (videoId: string) => void;
};

type StatusMeta = {
  icon: typeof Clock3;
  iconClassName: string;
};

const STATUS_META: Record<LibraryVideoProgressItem["status"], StatusMeta> = {
  pending: {
    icon: Clock3,
    iconClassName: "text-muted-foreground",
  },
  processing: {
    icon: Loader2,
    iconClassName: "text-blue-600 dark:text-blue-400",
  },
  ready: {
    icon: CheckCircle2,
    iconClassName: "text-emerald-600",
  },
  failed: {
    icon: XCircle,
    iconClassName: "text-destructive",
  },
};

export function VideoSidebarItem({ video, onSelect }: VideoSidebarItemProps) {
  const meta = STATUS_META[video.status];
  const Icon = meta.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="gap-2"
        onClick={() => onSelect(video.id)}
        aria-label={`View details for ${video.title}`}
        title={video.title}
      >
        <Icon
          size={14}
          className={cn(
            "shrink-0",
            meta.iconClassName,
            video.status === "processing" && "animate-spin",
          )}
          aria-hidden="true"
        />
        <span className="truncate text-xs">{video.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
