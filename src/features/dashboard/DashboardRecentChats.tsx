import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardRecentSession } from "@/features/dashboard/types";

type DashboardRecentChatsProps = {
  sessions: DashboardRecentSession[];
};

export function DashboardRecentChats({ sessions }: DashboardRecentChatsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Recent chats</CardTitle>
      </CardHeader>
      <CardContent className="pb-2 pt-0">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare size={20} className="text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground">No chats yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              Open a library and start a conversation.
            </p>
          </div>
        ) : (
          <ul role="list" className="-mx-2 divide-y divide-border">
            {sessions.map((session) => {
              const timeReference = session.lastMessageAt ?? session.createdAt;

              return (
                <li key={session.id}>
                  <Link
                    href={`/library/${session.libraryId}/chat/${session.id}`}
                    className="group flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{session.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Badge variant="outline" className="h-4 max-w-[120px] truncate px-1.5 text-[10px] font-normal">
                          {session.libraryName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(timeReference)}
                        </span>
                        {session.messageCount > 0 ? (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {session.messageCount} msg{session.messageCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(isoString: string) {
  const timestamp = new Date(isoString).getTime();
  const elapsedMs = Date.now() - timestamp;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  if (elapsedMinutes < 1) {
    return "just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) {
    return `${elapsedDays}d ago`;
  }

  return `${Math.floor(elapsedDays / 30)}mo ago`;
}
