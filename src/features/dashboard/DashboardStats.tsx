import { BookOpen, CheckCircle2, Clock, MessageSquare } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardTotals } from "@/features/dashboard/types";

type DashboardStatsProps = {
  totals: DashboardTotals;
};

type StatCardProps = {
  label: string;
  value: number;
  sublabel?: string;
  icon: React.ReactNode;
};

function StatCard({ label, value, sublabel, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-3xl leading-none font-semibold tabular-nums">
              {value.toLocaleString()}
            </p>
            {sublabel ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{sublabel}</p>
            ) : null}
          </div>
          <div className="mt-0.5 shrink-0 text-muted-foreground/45">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardStats({ totals }: DashboardStatsProps) {
  const queuedVideos = totals.videos - totals.readyVideos;

  return (
    <section aria-label="Overview metrics">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Libraries"
          value={totals.libraries}
          icon={<BookOpen size={18} />}
        />
        <StatCard
          label="Videos ready"
          value={totals.readyVideos}
          sublabel={queuedVideos > 0 ? `${queuedVideos} in queue` : "All videos ready"}
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Processing"
          value={totals.processingVideos}
          sublabel={totals.processingVideos > 0 ? "In progress" : "Queue clear"}
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Conversations"
          value={totals.chatSessions}
          icon={<MessageSquare size={18} />}
        />
      </div>
    </section>
  );
}
