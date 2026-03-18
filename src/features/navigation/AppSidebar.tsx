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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { NewLibraryDialog } from "@/features/libraries/NewLibraryDialog";
import { DeleteLibraryDialog } from "@/features/libraries/DeleteLibraryDialog";
import { RenameLibraryDialog } from "@/features/libraries/RenameLibraryDialog";
import { LibraryListItem } from "@/features/libraries/types";
import { useLibraries } from "@/features/libraries/useLibraries";
import {
  createCheckoutSession,
  createCustomerPortalSession,
} from "@/features/billing/api";
import { useBillingState } from "@/features/billing/useBillingState";
import { LibraryChatSubMenu } from "@/features/chat/LibraryChatSubMenu";
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
  const [deletingLibrary, setDeletingLibrary] = useState<LibraryListItem | null>(null);
  const [renamingLibrary, setRenamingLibrary] = useState<LibraryListItem | null>(null);
  const [billingAction, setBillingAction] = useState<"upgrade" | "topup" | "portal" | null>(null);

  const librariesQuery = useLibraries();
  const libraries = librariesQuery.data ?? [];

  const libraryIdMatch = pathname.match(/^\/library\/([^/]+)/);
  const activeLibraryId = libraryIdMatch?.[1] ?? null;

  const billingQuery = useBillingState();
  const billing = billingQuery.data;
  const billingReady = !billingQuery.isPending;
  const activePlanLabel =
    billing?.plan === "pro" ? "Pro" : billing?.plan === "builder" ? "Builder" : "Free";
  const canTopUp = Boolean(billing?.hasTopUpAccess);

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

  const billingActionBlocked = billingAction !== null || !billingReady;
  const manageBillingLabel = billingAction === "portal" ? "Opening..." : "Manage billing";
  const upgradeBillingLabel = !billingReady
    ? "Billing..."
    : billingAction === "upgrade" || billingAction === "topup"
      ? "Opening..."
      : canTopUp
        ? "Top up credits"
        : "Upgrade plan";

  function renderAccountMenuItems() {
    return (
      <>
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          <p className="text-xs font-medium">{activePlanLabel}</p>
          {typeof billing?.chatCreditsBalance === "number" ? (
            <p className="text-xs text-muted-foreground">{billing.chatCreditsBalance} chat credits left</p>
          ) : null}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => { void handleManageBilling(); }}
          disabled={billingActionBlocked}
        >
          <CreditCard size={14} />
          <span>{manageBillingLabel}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => { void handleUpgradeOrTopUp(); }}
          disabled={billingActionBlocked}
        >
          <Plus size={14} />
          <span>{upgradeBillingLabel}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => { void handleSignOut(); }}
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </DropdownMenuItem>
      </>
    );
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
                    onClick={() => { closeMobileSidebar(); }}
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

            <SidebarMenu>
              {librariesQuery.isPending ? (
                <div className="space-y-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-4/5" />
                </div>
              ) : (
                libraries.map((library) => {
                  const libraryHref = `/library/${library.id}`;
                  const isThisLibraryActive = activeLibraryId === library.id;

                  return (
                    <SidebarMenuItem key={library.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === libraryHref}
                        className="group-data-[collapsible=icon]:hidden"
                      >
                        <Link
                          href={libraryHref}
                          onClick={() => { closeMobileSidebar(); }}
                        >
                          <span className="truncate text-xs">{library.name}</span>
                        </Link>
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
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setRenamingLibrary(library)}
                          >
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

                      {isThisLibraryActive && (
                        <LibraryChatSubMenu
                          libraryId={library.id}
                          onSessionSelect={closeMobileSidebar}
                        />
                      )}
                    </SidebarMenuItem>
                  );
                })
              )}

              {!librariesQuery.isPending && libraries.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  No libraries yet
                </p>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-3 py-3">
          <div className="space-y-2 group-data-[collapsible=icon]:space-y-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors hover:bg-accent group-data-[collapsible=icon]:hidden"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                    <p className="text-xs font-medium">{activePlanLabel}</p>
                    {typeof billing?.chatCreditsBalance === "number" ? (
                      <p className="text-xs text-muted-foreground">
                        {billing.chatCreditsBalance} chat credits left
                      </p>
                    ) : null}
                  </div>
                  <MoreHorizontal size={16} className="shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="min-w-56">
                {renderAccountMenuItems()}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground group-data-[collapsible=icon]:inline-flex"
                >
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="min-w-56">
                {renderAccountMenuItems()}
              </DropdownMenuContent>
            </DropdownMenu>
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
