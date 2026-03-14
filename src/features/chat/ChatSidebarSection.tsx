"use client";

import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useCreateChatSession } from "@/features/chat/useCreateChatSession";
import { useChatSessions } from "@/features/chat/useChatSessions";

type ChatSidebarSectionProps = {
  libraryId: string;
};

export function ChatSidebarSection({ libraryId }: ChatSidebarSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionsQuery = useChatSessions(libraryId);
  const createSessionMutation = useCreateChatSession(libraryId);

  const sessions = [...(sessionsQuery.data ?? [])].sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.createdAt;
    const bTime = b.lastMessageAt ?? b.createdAt;

    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  async function handleNewChat() {
    try {
      const session = await createSessionMutation.mutateAsync();
      router.push(`/library/${libraryId}/chat/${session.id}`);
    } catch {
      toast.error("Could not create chat. Please try again.");
    }
  }

  return (
    <section className="pt-2">
      <div className="mb-1 flex items-center justify-between px-2">
        <h3 className="flex h-8 items-center text-xs font-medium text-muted-foreground">Chats</h3>
        <button
          type="button"
          onClick={() => {
            void handleNewChat();
          }}
          disabled={createSessionMutation.isPending}
          className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-60"
          aria-label="New chat"
        >
          <MessageSquarePlus size={14} />
          <span>{createSessionMutation.isPending ? "Creating…" : "New"}</span>
        </button>
      </div>

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
                    <Link href={href}>
                      <span className="truncate text-xs">{session.title}</span>
                    </Link>
                  </SidebarMenuButton>
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
    </section>
  );
}
