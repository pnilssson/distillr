import { BookOpen, CheckCircle2, Clock, MessageSquare } from "lucide-react";

import { OverviewStatCard } from "@/components/OverviewStatCard";
import type { DashboardTotals } from "@/features/dashboard/types";

type DashboardStatsProps = {
  totals: DashboardTotals;
};

export function DashboardStats({ totals }: DashboardStatsProps) {
  const queuedVideos = totals.videos - totals.readyVideos;

  return (
    <section aria-label="Overview metrics">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewStatCard
          label="Libraries"
          value={totals.libraries}
          icon={<BookOpen size={18} />}
        />
        <OverviewStatCard
          label="Videos ready"
          value={totals.readyVideos}
          sublabel={queuedVideos > 0 ? `${queuedVideos} in queue` : "All videos ready"}
          icon={<CheckCircle2 size={18} />}
        />
        <OverviewStatCard
          label="Processing"
          value={totals.processingVideos}
          sublabel={totals.processingVideos > 0 ? "In progress" : "Queue clear"}
          icon={<Clock size={18} />}
        />
        <OverviewStatCard
          label="Conversations"
          value={totals.chatSessions}
          icon={<MessageSquare size={18} />}
        />
      </div>
    </section>
  );
}
