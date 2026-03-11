"use client";

import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLibraries } from "@/features/libraries/useLibraries";

export function MobileTopNav() {
  const pathname = usePathname();

  const librariesQuery = useLibraries();
  const libraries = librariesQuery.data ?? [];

  const libraryIdMatch = pathname.match(/^\/library\/([^/]+)/);
  const activeLibraryId = libraryIdMatch?.[1] ?? null;
  const activeLibrary = activeLibraryId
    ? libraries.find((l) => l.id === activeLibraryId) ?? null
    : null;

  const isLibraryRoute = Boolean(activeLibraryId);

  const title = activeLibrary?.name ?? "Library";

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background px-3 md:hidden">
      <SidebarTrigger aria-label="Open menu" />
      {isLibraryRoute && librariesQuery.isPending ? (
        <Skeleton className="h-4 w-28" />
      ) : (
        <span className="truncate text-sm font-medium">
          {isLibraryRoute ? title : "Distillr"}
        </span>
      )}
    </header>
  );
}
