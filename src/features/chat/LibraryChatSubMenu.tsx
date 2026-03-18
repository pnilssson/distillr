"use client";

import { useState } from "react";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useCreateChatSession } from "@/features/chat/useCreateChatSession";
import { useDeleteChatSession } from "@/features/chat/useDeleteChatSession";
import { useChatSessions } from "@/features/chat/useChatSessions";

type Props = {
  libraryId: string;
  onSessionSelect?: () => void;
};

export function LibraryChatSubMenu({ libraryId, onSessionSelect }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [deletingSession, setDeletingSession] = useState<{ id: string; title: string } | null>(null);
  const sessionsQuery = useChatSessions(libraryId);
  const createSessionMutation = useCreateChatSession(libraryId);
  const deleteSessionMutation = useDeleteChatSession(libraryId);

  const sessions = [...(sessionsQuery.data ?? [])].sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.createdAt;
    const bTime = b.lastMessageAt ?? b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  async function handleNewChat() {
    try {
      const session = await createSessionMutation.mutateAsync();
      router.push(`/library/${libraryId}/chat/${session.id}`);
      onSessionSelect?.();
    } catch {
      toast.error("Could not create chat. Please try again.");
    }
  }

  async function handleDeleteChat() {
    if (!deletingSession) return;

    const activeSessionHref = `/library/${libraryId}/chat/${deletingSession.id}`;

    try {
      await deleteSessionMutation.mutateAsync(deletingSession.id);
      setDeletingSession(null);

      if (pathname === activeSessionHref) {
        router.push(`/library/${libraryId}`);
        onSessionSelect?.();
      }
    } catch {
      toast.error("Could not delete chat. Please try again.");
    }
  }

  return (
    <>
      <SidebarMenuSub>
        {/* New chat action */}
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild>
            <button
              type="button"
              onClick={() => { void handleNewChat(); }}
              disabled={createSessionMutation.isPending}
              className="text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              <Plus size={12} aria-hidden="true" />
              <span>{createSessionMutation.isPending ? "Starting..." : "New chat"}</span>
            </button>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>

        {/* Loading skeletons */}
        {sessionsQuery.isPending ? (
          <>
            <SidebarMenuSubItem>
              <div className="flex h-7 items-center px-2">
                <Skeleton className="h-3 w-full" />
              </div>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem>
              <div className="flex h-7 items-center px-2">
                <Skeleton className="h-3 w-4/5" />
              </div>
            </SidebarMenuSubItem>
          </>
        ) : null}

        {/* Session list */}
        {!sessionsQuery.isPending &&
          sessions.map((session) => {
            const href = `/library/${libraryId}/chat/${session.id}`;
            const isActive = pathname === href;

            return (
              <SidebarMenuSubItem key={session.id} className="group/chat-item">
                <SidebarMenuSubButton asChild isActive={isActive}>
                  <Link
                    href={href}
                    onClick={() => { onSessionSelect?.(); }}
                    className="pr-6"
                  >
                    <span className="truncate">{session.title}</span>
                  </Link>
                </SidebarMenuSubButton>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction
                      showOnHover
                      aria-label={`Options for ${session.title}`}
                      className="top-1"
                    >
                      <MoreHorizontal size={14} />
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="min-w-36">
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => setDeletingSession({ id: session.id, title: session.title })}
                    >
                      <Trash2 size={13} />
                      Delete chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuSubItem>
            );
          })}

        {/* Error state */}
        {sessionsQuery.isError ? (
          <SidebarMenuSubItem>
            <span className="px-2 py-1 text-xs text-destructive">Could not load chats.</span>
          </SidebarMenuSubItem>
        ) : null}
      </SidebarMenuSub>

      <AlertDialog
        open={Boolean(deletingSession)}
        onOpenChange={(open) => { if (!open) setDeletingSession(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat and its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deletingSession ? (
            <p className="truncate text-xs text-muted-foreground" title={deletingSession.title}>
              {deletingSession.title}
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSessionMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { void handleDeleteChat(); }}
              disabled={deleteSessionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSessionMutation.isPending ? "Deleting..." : "Delete chat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
