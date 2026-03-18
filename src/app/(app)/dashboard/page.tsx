import { EmptyDashboardState } from "@/features/dashboard/EmptyDashboardState";
import type { Metadata } from "next";

import { DashboardContent } from "@/features/dashboard/DashboardContent";
import { getBillingStateForUser } from "@/server/billing/queries";
import { requireUserOrRedirect } from "@/server/core/auth/user";
import { getDashboardSummary } from "@/server/dashboard/queries";

export const metadata: Metadata = {
  title: "Home",
};

export default async function DashboardPage() {
  const user = await requireUserOrRedirect();

  const [summary, billingState] = await Promise.all([
    getDashboardSummary(user.id),
    getBillingStateForUser({
      userId: user.id,
    }),
  ]);

  if (summary.libraries.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <EmptyDashboardState />
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <DashboardContent summary={summary} billingState={billingState} />
    </main>
  );
}
