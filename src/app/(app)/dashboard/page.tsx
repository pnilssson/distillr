import { EmptyDashboardState } from "@/features/dashboard/EmptyDashboardState";

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <EmptyDashboardState />
    </main>
  );
}
