"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Library, LogOut, Plus } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { NewLibraryDialog } from "@/features/libraries/NewLibraryDialog";
import { LibraryListItem } from "@/features/libraries/types";
import { createSupabaseBrowserClient } from "@/server/core/supabase/browser";

type AppSidebarProps = {
  libraries: LibraryListItem[];
  userEmail: string;
};

export function AppSidebar({ libraries, userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
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
                    className="justify-between"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Library size={14} className="shrink-0 text-muted-foreground" />
                      <span className="truncate">{library.name}</span>
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {libraries.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  No libraries yet
                </p>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
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
    </>
  );
}
