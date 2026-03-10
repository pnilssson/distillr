"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import posthog from "posthog-js";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NewLibraryDialog } from "@/features/libraries/NewLibraryDialog";
import { DeleteLibraryDialog } from "@/features/libraries/DeleteLibraryDialog";
import { RenameLibraryDialog } from "@/features/libraries/RenameLibraryDialog";
import { LibraryListItem } from "@/features/libraries/types";
import { createSupabaseBrowserClient } from "@/server/core/supabase/browser";

type AppSidebarProps = {
  libraries: LibraryListItem[];
  userEmail: string;
  userId: string;
};

export function AppSidebar({ libraries, userEmail, userId }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingLibrary, setDeletingLibrary] = useState<LibraryListItem | null>(null);
  const [renamingLibrary, setRenamingLibrary] = useState<LibraryListItem | null>(null);

  const libraryIdMatch = pathname.match(/^\/library\/([^/]+)/);
  const activeLibraryId = libraryIdMatch?.[1] ?? null;
  const activeLibrary = activeLibraryId
    ? libraries.find((l) => l.id === activeLibraryId) ?? null
    : null;

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      return;
    }

    posthog.identify(userId, userEmail ? { email: userEmail } : undefined);
  }, [userEmail, userId]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();

    if (process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      posthog.reset();
    }

    router.push("/");
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              Distillr
            </span>
            <SidebarTrigger className="shrink-0" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Libraries</SidebarGroupLabel>
            <SidebarGroupAction
              onClick={() => setDialogOpen(true)}
              aria-label="New library"
            >
              <Plus size={16} />
            </SidebarGroupAction>

            <SidebarMenu>
              {libraries.map((library) => (
                <SidebarMenuItem key={library.id}>
                  <SidebarMenuButton
                    isActive={pathname === `/library/${library.id}`}
                    onClick={() => router.push(`/library/${library.id}`)}
                    className="group-data-[collapsible=icon]:hidden"
                  >
                    <span className="truncate">{library.name}</span>
                  </SidebarMenuButton>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction
                        showOnHover
                        aria-label={`Options for ${library.name}`}
                        className="group-data-[collapsible=icon]:hidden"
                      >
                        <MoreHorizontal size={16} />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="min-w-40">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => setRenamingLibrary(library)}>
                        <Pencil size={14} />
                        Rename library
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => setDeletingLibrary(library)}
                      >
                        <Trash2 size={14} />
                        Delete library
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}

              {libraries.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  No libraries yet
                </p>
              )}
            </SidebarMenu>
          </SidebarGroup>

          {activeLibrary && (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel>Sources</SidebarGroupLabel>
              <SidebarGroupAction aria-label="Add source" disabled>
                <Plus size={16} />
              </SidebarGroupAction>

              <SidebarMenu>
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  No sources yet
                </p>
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="px-3 py-3">
          <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              <p className="text-xs font-medium">Free</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={handleSignOut}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <NewLibraryDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {deletingLibrary && (
        <DeleteLibraryDialog
          libraryId={deletingLibrary.id}
          libraryName={deletingLibrary.name}
          open={Boolean(deletingLibrary)}
          onOpenChange={(open) => {
            if (!open) setDeletingLibrary(null);
          }}
        />
      )}

      {renamingLibrary && (
        <RenameLibraryDialog
          libraryId={renamingLibrary.id}
          libraryName={renamingLibrary.name}
          open={Boolean(renamingLibrary)}
          onOpenChange={(open) => {
            if (!open) setRenamingLibrary(null);
          }}
        />
      )}
    </>
  );
}
