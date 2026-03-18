import Link from "next/link";
import { MessageSquare } from "lucide-react";

import type { DashboardRecentSession } from "@/features/dashboard/types";

type DashboardRecentChatsProps = {
  sessions: DashboardRecentSession[];
};

export function DashboardRecentChats({ sessions }: DashboardRecentChatsProps) {
  return (
    <section aria-labelledby="dashboard-recent-chats-heading">
      <div className="mb-3 flex items-center gap-2">
        <h2 id="dashboard-recent-chats-heading" className="text-sm font-semibold">
          Recent chats
        </h2>
        {sessions.length > 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
            {sessions.length}
          </span>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card">
        {sessions.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No chats yet.</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Open a library and start a conversation.
            </p>
          </div>
        ) : (
          <ul role="list" className="divide-y">
            {sessions.map((session) => {
              const timeReference = session.lastMessageAt ?? session.createdAt;

              return (
                <li key={session.id}>
                  <Link
                    href={`/library/${session.libraryId}/chat/${session.id}`}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                      <MessageSquare size={14} className="text-muted-foreground" aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug" title={session.title}>
                        {session.title}
                      </p>
                      <div className="mt-0.5 flex min-w-0 items-center gap-2">
                        <span className="truncate text-xs text-muted-foreground" title={session.libraryName}>
                          {session.libraryName}
                        </span>
                        <span className="text-muted-foreground/40" aria-hidden="true">
                          ·
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatTimeAgo(timeReference)}
                        </span>
                        {session.messageCount > 0 ? (
                          <>
                            <span className="text-muted-foreground/40" aria-hidden="true">
                              ·
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {session.messageCount} msg{session.messageCount === 1 ? "" : "s"}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
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
