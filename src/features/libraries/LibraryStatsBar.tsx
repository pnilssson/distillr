import { CheckCircle2, Database, MessageSquare } from "lucide-react";

import type { SourceListItem } from "@/features/sources/types";
import type { LibraryVideosProgress } from "@/features/videos/types";
import type { ChatSessionListItem } from "@/features/chat/types";

type Props = {
  sources: SourceListItem[];
  videosData: LibraryVideosProgress | undefined;
  sessions: ChatSessionListItem[];
};

type StatItemProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
};

function StatItem({ icon, label, value, sub }: StatItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card px-5 py-4">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums leading-none">{value}</p>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}

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
    <div className="grid grid-cols-3 gap-3">
      <StatItem
        icon={<Database size={16} />}
        label="Sources"
        value={String(sources.length)}
        sub={sourceTypeBreakdown}
      />
      <StatItem
        icon={<CheckCircle2 size={16} />}
        label="Videos ready"
        value={totalCount > 0 ? `${readyCount} / ${totalCount}` : "0"}
        sub={videoSub}
      />
      <StatItem
        icon={<MessageSquare size={16} />}
        label="Chat sessions"
        value={String(sessions.length)}
        sub={sessions.length > 0 ? `${sessions.length} conversation${sessions.length !== 1 ? "s" : ""}` : undefined}
      />
    </div>
  );
}
