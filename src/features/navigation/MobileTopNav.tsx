"use client";

import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useChatSessions } from "@/features/chat/useChatSessions";
import { useLibraries } from "@/features/libraries/useLibraries";

export function MobileTopNav() {
  const pathname = usePathname();

  const librariesQuery = useLibraries();
  const libraries = librariesQuery.data ?? [];

  const libraryIdMatch = pathname.match(/^\/library\/([^/]+)/);
  const chatRouteMatch = pathname.match(/^\/library\/([^/]+)\/chat\/([^/]+)/);
  const activeLibraryId = libraryIdMatch?.[1] ?? null;
  const activeSessionId = chatRouteMatch?.[2] ?? null;
  const activeLibrary = activeLibraryId
    ? libraries.find((l) => l.id === activeLibraryId) ?? null
    : null;
  const sessionsQuery = useChatSessions(activeSessionId ? activeLibraryId : null);
  const sessions = sessionsQuery.data ?? [];
  const activeSession = activeSessionId
    ? sessions.find((session) => session.id === activeSessionId) ?? null
    : null;

  const isLibraryRoute = Boolean(activeLibraryId);
  const isChatRoute = Boolean(activeSessionId);

  const showSkeleton =
    (isLibraryRoute && librariesQuery.isPending) ||
    (isChatRoute && sessionsQuery.isPending);

  const title = isChatRoute ? activeSession?.title ?? "Chat" : activeLibrary?.name ?? "Library";

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background px-3 md:hidden">
      <SidebarTrigger aria-label="Open menu" />
      {showSkeleton ? (
        <Skeleton className="h-4 w-28" />
      ) : (
        <span className="truncate text-sm font-medium">
          {isLibraryRoute ? title : "Distillr"}
        </span>
      )}
    </header>
  );
}
