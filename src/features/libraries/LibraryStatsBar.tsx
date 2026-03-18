import { CheckCircle2, Database, MessageSquare } from "lucide-react";

import { OverviewStatCard } from "@/components/OverviewStatCard";
import type { SourceListItem } from "@/features/sources/types";
import type { LibraryVideosProgress } from "@/features/videos/types";
import type { ChatSessionListItem } from "@/features/chat/types";

type Props = {
  sources: SourceListItem[];
  videosData: LibraryVideosProgress | undefined;
  sessions: ChatSessionListItem[];
};

export function LibraryStatsBar({ sources, videosData, sessions }: Props) {
  const readyCount = videosData?.counts.ready ?? 0;
  const totalCount = videosData?.counts.total ?? 0;
  const inFlightCount =
    (videosData?.counts.pending ?? 0) + (videosData?.counts.processing ?? 0);

  const videoSub =
    inFlightCount > 0
      ? `${inFlightCount} processing`
      : totalCount > 0
        ? "all ready"
        : undefined;

  const sourceTypeBreakdown = (() => {
    const channels = sources.filter((s) => s.sourceType === "youtube_channel").length;
    const playlists = sources.filter((s) => s.sourceType === "youtube_playlist").length;
    const videos = sources.filter((s) => s.sourceType === "youtube_video").length;
    const parts: string[] = [];
    if (channels) parts.push(`${channels} channel${channels !== 1 ? "s" : ""}`);
    if (playlists) parts.push(`${playlists} playlist${playlists !== 1 ? "s" : ""}`);
    if (videos) parts.push(`${videos} video${videos !== 1 ? "s" : ""}`);
    return parts.join(", ") || undefined;
  })();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <OverviewStatCard
        icon={<Database size={16} />}
        label="Sources"
        value={String(sources.length)}
        sublabel={sourceTypeBreakdown}
      />
      <OverviewStatCard
        icon={<CheckCircle2 size={16} />}
        label="Content ready"
        value={totalCount > 0 ? `${readyCount} / ${totalCount}` : "0"}
        sublabel={videoSub}
      />
      <OverviewStatCard
        icon={<MessageSquare size={16} />}
        label="Chat sessions"
        value={String(sessions.length)}
        sublabel={sessions.length > 0 ? `${sessions.length} conversation${sessions.length !== 1 ? "s" : ""}` : undefined}
      />
    </div>
  );
}
