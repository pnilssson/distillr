import { DashboardActivityChart } from "@/features/dashboard/DashboardActivityChart";
import { DashboardCreditsCard } from "@/features/dashboard/DashboardCreditsCard";
import { DashboardLibraryList } from "@/features/dashboard/DashboardLibraryList";
import { DashboardRecentChats } from "@/features/dashboard/DashboardRecentChats";
import { DashboardStats } from "@/features/dashboard/DashboardStats";
import type { BillingState } from "@/lib/billing/types";
import type { DashboardSummary } from "@/features/dashboard/types";

type DashboardContentProps = {
  summary: DashboardSummary;
  billingState: BillingState;
};

export function DashboardContent({ summary, billingState }: DashboardContentProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here is what is happening across your research libraries.
        </p>
      </header>

      <div className="mt-7 space-y-5">
        <DashboardStats totals={summary.totals} />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <DashboardActivityChart activityByDay={summary.activityByDay} />
          </div>
          <div>
            <DashboardCreditsCard billing={billingState} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <DashboardLibraryList libraries={summary.libraries} />
          <DashboardRecentChats sessions={summary.recentSessions} />
        </section>
      </div>
    </div>
  );
}
