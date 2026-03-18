import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-2 h-4 w-72" />

        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Skeleton className="h-[286px] w-full xl:col-span-2" />
          <Skeleton className="h-[286px] w-full" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Skeleton className="h-[292px] w-full" />
          <Skeleton className="h-[292px] w-full" />
        </div>
      </div>
    </main>
  );
}
