"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
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

      <div className="max-h-40 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
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
      </div>
    </SidebarGroup>
  );
}
