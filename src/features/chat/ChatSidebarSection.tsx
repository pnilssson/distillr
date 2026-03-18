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
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCreateChatSession } from "@/features/chat/useCreateChatSession";
import { useDeleteChatSession } from "@/features/chat/useDeleteChatSession";
import { useChatSessions } from "@/features/chat/useChatSessions";

type ChatSidebarSectionProps = {
  libraryId: string;
  onSessionSelect?: () => void;
};

export function ChatSidebarSection({ libraryId, onSessionSelect }: ChatSidebarSectionProps) {
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
    if (!deletingSession) {
      return;
    }

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
      <SidebarGroup className="shrink-0 group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="pr-8">
          Chats
          {!sessionsQuery.isPending ? (
            <span className="ml-1.5 tabular-nums text-muted-foreground/60">{sessions.length}</span>
          ) : null}
        </SidebarGroupLabel>
        <SidebarGroupAction
          onClick={() => {
            void handleNewChat();
          }}
          aria-label="New chat"
          disabled={createSessionMutation.isPending}
          className={createSessionMutation.isPending ? "opacity-60" : undefined}
        >
          <Plus size={16} />
        </SidebarGroupAction>

        <SidebarMenu>
          {sessionsQuery.isPending ? (
            <div className="space-y-2 px-2 py-1">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
            </div>
          ) : null}

          {!sessionsQuery.isPending && sessions.length > 0
            ? sessions.map((session) => {
                const href = `/library/${libraryId}/chat/${session.id}`;

                return (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton asChild isActive={pathname === href}>
                      <Link
                        href={href}
                        onClick={() => {
                          onSessionSelect?.();
                        }}
                      >
                        <span className="truncate text-xs">{session.title}</span>
                      </Link>
                    </SidebarMenuButton>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction
                          showOnHover
                          aria-label={`Options for ${session.title}`}
                        >
                          <MoreHorizontal size={16} />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="min-w-40">
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => {
                            setDeletingSession({ id: session.id, title: session.title });
                          }}
                        >
                          <Trash2 size={14} />
                          Delete chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                );
              })
            : null}

          {!sessionsQuery.isPending && !sessionsQuery.isError && sessions.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">No chats yet</p>
          ) : null}

          {sessionsQuery.isError ? (
            <p className="px-2 py-1 text-xs text-destructive">Could not load chats.</p>
          ) : null}
        </SidebarMenu>
      </SidebarGroup>

      <AlertDialog
        open={Boolean(deletingSession)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingSession(null);
          }
        }}
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
              onClick={() => {
                void handleDeleteChat();
              }}
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
