"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { LibraryListItem } from "@/features/libraries/types";

type MobileTopNavProps = {
  libraries: LibraryListItem[];
};

export function MobileTopNav({ libraries }: MobileTopNavProps) {
  const pathname = usePathname();

  const libraryIdMatch = pathname.match(/^\/library\/([^/]+)/);
  const activeLibraryId = libraryIdMatch?.[1] ?? null;
  const activeLibrary = activeLibraryId
    ? libraries.find((l) => l.id === activeLibraryId) ?? null
    : null;

  const title = activeLibrary?.name ?? "Distillr";

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background px-3 md:hidden">
      <SidebarTrigger aria-label="Open menu" />
      <span className="truncate text-sm font-medium">{title}</span>
    </header>
  );
}
