"use client";

import { useState } from "react";
import { MessageSquare, MoreHorizontal, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteChatSession } from "@/features/chat/useDeleteChatSession";
import type { ChatSessionListItem } from "@/features/chat/types";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

type ChatRowProps = {
  session: ChatSessionListItem;
  libraryId: string;
  onDelete: (session: { id: string; title: string }) => void;
};

function ChatRow({ session, libraryId, onDelete }: ChatRowProps) {
  const lastActivity = session.lastMessageAt ?? session.updatedAt;
  const ago = timeAgo(lastActivity);

  return (
    <div className="group flex items-center transition-colors hover:bg-muted/50">
      <Link
        href={`/library/${libraryId}/chat/${session.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
          <MessageSquare size={14} className="text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-snug" title={session.title}>
            {session.title}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {session.messageCount} {session.messageCount === 1 ? "message" : "messages"}
            </span>
            <span className="text-muted-foreground/40" aria-hidden="true">·</span>
            <span className="text-xs text-muted-foreground">{ago}</span>
          </div>
        </div>
      </Link>

      <div className="pr-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={`Actions for ${session.title}`}
            >
              <MoreHorizontal size={14} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => onDelete({ id: session.id, title: session.title })}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 size={13} aria-hidden="true" />
              Delete chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

type Props = {
  libraryId: string;
  sessions: ChatSessionListItem[];
  isLoading: boolean;
  isNewChatPending: boolean;
  canChat: boolean;
  onNewChat: () => void;
};

export function ChatSection({ libraryId, sessions, isLoading, isNewChatPending, canChat, onNewChat }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [deletingSession, setDeletingSession] = useState<{ id: string; title: string } | null>(null);
  const deleteSessionMutation = useDeleteChatSession(libraryId);

  const sorted = [...sessions].sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.updatedAt;
    const bTime = b.lastMessageAt ?? b.updatedAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  async function handleDeleteChat() {
    if (!deletingSession) return;
    try {
      await deleteSessionMutation.mutateAsync(deletingSession.id);
      setDeletingSession(null);
      if (pathname === `/library/${libraryId}/chat/${deletingSession.id}`) {
        router.push(`/library/${libraryId}`);
      }
    } catch {
      toast.error("Could not delete chat. Please try again.");
    }
  }

  return (
    <>
      <section aria-labelledby="chats-heading">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="chats-heading" className="text-sm font-semibold">
              Chats
            </h2>
            {!isLoading && sessions.length > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                {sessions.length}
              </span>
            ) : null}
          </div>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onNewChat}
            disabled={isNewChatPending || !canChat}
          >
            {isNewChatPending ? (
              <>
                <Sparkles size={12} aria-hidden="true" />
                Starting...
              </>
            ) : (
              <>
                <Plus size={12} aria-hidden="true" />
                New chat
              </>
            )}
          </Button>
        </div>

        <div className="rounded-xl border bg-card">
          {isLoading ? (
            <div className="divide-y">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="size-8 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {canChat
                  ? "No chats yet. Start a conversation with your library."
                  : "Add and process sources to start chatting."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {sorted.map((session) => (
                <ChatRow
                  key={session.id}
                  session={session}
                  libraryId={libraryId}
                  onDelete={setDeletingSession}
                />
              ))}
            </div>
          )}
        </div>
      </section>

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
