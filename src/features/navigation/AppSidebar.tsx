"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  Home,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import posthog from "posthog-js";
import { toast } from "sonner";
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewLibraryDialog } from "@/features/libraries/NewLibraryDialog";
import { DeleteLibraryDialog } from "@/features/libraries/DeleteLibraryDialog";
import { RenameLibraryDialog } from "@/features/libraries/RenameLibraryDialog";
import { LibraryListItem } from "@/features/libraries/types";
import { useLibraries } from "@/features/libraries/useLibraries";
import { AddSourceDialog } from "@/features/sources/AddSourceDialog";
import { DeleteSourceDialog } from "@/features/sources/DeleteSourceDialog";
import { SourceDetailsDialog } from "@/features/sources/SourceDetailsDialog";
import { getSourceLabel, SourceSidebarItem } from "@/features/sources/SourceSidebarItem";
import { SourceListItem } from "@/features/sources/types";
import { useSources } from "@/features/sources/useSources";
import {
  createCheckoutSession,
  createCustomerPortalSession,
} from "@/features/billing/api";
import { useBillingState } from "@/features/billing/useBillingState";
import { ChatSidebarSection } from "@/features/chat/ChatSidebarSection";
import { VideoSidebarSection } from "@/features/videos/VideoSidebarSection";
import { hasPosthogClientConfig } from "@/lib/analytics/posthog-client-config";
import { createSupabaseBrowserClient } from "@/server/core/supabase/browser";

type AppSidebarProps = {
  userEmail: string;
  userId: string;
};

export function AppSidebar({ userEmail, userId }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [deletingSource, setDeletingSource] = useState<SourceListItem | null>(null);
  const [deletingLibrary, setDeletingLibrary] = useState<LibraryListItem | null>(null);
  const [renamingLibrary, setRenamingLibrary] = useState<LibraryListItem | null>(null);
  const [billingAction, setBillingAction] = useState<"upgrade" | "topup" | "portal" | null>(null);

  const librariesQuery = useLibraries();
  const libraries = librariesQuery.data ?? [];

  const libraryIdMatch = pathname.match(/^\/library\/([^/]+)/);
  const activeLibraryId = libraryIdMatch?.[1] ?? null;

  const sourcesQuery = useSources(activeLibraryId);
  const sources = sourcesQuery.data ?? [];
  const billingQuery = useBillingState();
  const billing = billingQuery.data;
  const billingReady = !billingQuery.isPending;
  const activePlanLabel =
    billing?.plan === "pro" ? "Pro" : billing?.plan === "builder" ? "Builder" : "Free";
  const canTopUp = Boolean(billing?.hasTopUpAccess);
  const selectedSource = selectedSourceId
    ? (sources.find((source) => source.id === selectedSourceId) ?? null)
    : null;

  useEffect(() => {
    if (!hasPosthogClientConfig()) {
      return;
    }

    posthog.identify(userId, userEmail ? { email: userEmail } : undefined);
  }, [userEmail, userId]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();

    if (hasPosthogClientConfig()) {
      posthog.reset();
    }

    router.push("/");
  }

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  async function handleManageBilling() {
    setBillingAction("portal");

    try {
      const url = await createCustomerPortalSession(pathname);
      window.location.assign(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open billing settings right now.");
    } finally {
      setBillingAction(null);
    }
  }

  async function handleUpgradeOrTopUp() {
    const target = canTopUp ? "top_up_500" : "builder";
    setBillingAction(canTopUp ? "topup" : "upgrade");

    try {
      const url = await createCheckoutSession(target, pathname);
      window.location.assign(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start checkout right now.");
    } finally {
      setBillingAction(null);
    }
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
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link
                    href="/dashboard"
                    onClick={() => {
                      closeMobileSidebar();
                    }}
                  >
                    <Home size={16} />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="shrink-0">
            <SidebarGroupLabel className="pr-8">
              Libraries
              {!librariesQuery.isPending ? (
                <span className="ml-1.5 tabular-nums text-muted-foreground/60">
                  {libraries.length}
                </span>
              ) : null}
            </SidebarGroupLabel>
            <SidebarGroupAction
              onClick={() => setDialogOpen(true)}
              aria-label="New library"
            >
              <Plus size={16} />
            </SidebarGroupAction>
            <div className="max-h-40 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <SidebarMenu>
                {librariesQuery.isPending ? (
                  <div className="space-y-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-7 w-4/5" />
                  </div>
                ) : (
                  libraries.map((library) => (
                    <SidebarMenuItem key={library.id}>
                      <SidebarMenuButton
                        isActive={
                          pathname === `/library/${library.id}` ||
                          pathname.startsWith(`/library/${library.id}/`)
                        }
                        onClick={() => router.push(`/library/${library.id}`)}
                        className="group-data-[collapsible=icon]:hidden"
                      >
                        <span className="truncate text-xs">{library.name}</span>
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
                  ))
                )}

                {!librariesQuery.isPending && libraries.length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    No libraries yet
                  </p>
                )}
              </SidebarMenu>
            </div>
          </SidebarGroup>

          {activeLibraryId && (
            <>
              <ChatSidebarSection
                libraryId={activeLibraryId}
                onSessionSelect={() => {
                  closeMobileSidebar();
                }}
              />

              <SidebarGroup className="shrink-0 group-data-[collapsible=icon]:hidden">
                <SidebarGroupLabel className="pr-8">
                  Sources
                  {!sourcesQuery.isPending ? (
                    <span className="ml-1.5 tabular-nums text-muted-foreground/60">
                      {sources.length}
                    </span>
                  ) : null}
                </SidebarGroupLabel>
                <SidebarGroupAction
                  onClick={() => setAddingSource(true)}
                  aria-label="Add source"
                >
                  <Plus size={16} />
                </SidebarGroupAction>

                <div className="max-h-32 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                  <SidebarMenu>
                    {sourcesQuery.isPending ? (
                      <div className="space-y-2 px-2 py-1">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-4/5" />
                      </div>
                    ) : (
                      sources.map((source) => (
                        <SourceSidebarItem key={source.id} source={source} onSelect={setSelectedSourceId} />
                      ))
                    )}

                    {!sourcesQuery.isPending && sources.length === 0 && (
                      <p className="px-2 py-1 text-xs text-muted-foreground">
                        No sources yet
                      </p>
                    )}
                  </SidebarMenu>
                </div>
              </SidebarGroup>

              <VideoSidebarSection libraryId={activeLibraryId} />
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="px-3 py-3">
          <div className="space-y-2 group-data-[collapsible=icon]:space-y-0">
            <div className="min-w-0 px-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              <p className="text-xs font-medium">{activePlanLabel}</p>
              {typeof billing?.chatCreditsBalance === "number" ? (
                <p className="text-xs text-muted-foreground">
                  {billing.chatCreditsBalance} chat credits left
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleManageBilling();
                }}
                disabled={billingAction !== null || !billingReady}
                className="h-8 px-2 text-xs group-data-[collapsible=icon]:hidden"
              >
                <CreditCard size={14} />
                Manage
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleUpgradeOrTopUp();
                }}
                disabled={billingAction !== null || !billingReady}
                className="h-8 px-2 text-xs group-data-[collapsible=icon]:hidden"
              >
                {!billingReady ? "Billing..." : canTopUp ? "Top up" : "Upgrade"}
              </Button>

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
          </div>
        </SidebarFooter>
      </Sidebar>

      <NewLibraryDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {activeLibraryId && (
        <AddSourceDialog
          libraryId={activeLibraryId}
          open={addingSource}
          onOpenChange={setAddingSource}
        />
      )}

      {activeLibraryId && (
        <SourceDetailsDialog
          source={selectedSource}
          open={Boolean(selectedSourceId && selectedSource)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSourceId(null);
            }
          }}
          onDelete={(source) => {
            setDeletingSource(source);
            setSelectedSourceId(null);
          }}
        />
      )}

      {activeLibraryId && deletingSource && (
        <DeleteSourceDialog
          libraryId={activeLibraryId}
          sourceId={deletingSource.id}
          sourceLabel={getSourceLabel(deletingSource)}
          open={Boolean(deletingSource)}
          onOpenChange={(open) => {
            if (!open) setDeletingSource(null);
          }}
        />
      )}

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
