"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useChatSessions } from "@/features/chat/useChatSessions";
import { useCreateChatSession } from "@/features/chat/useCreateChatSession";
import { useLibraryVideos } from "@/features/videos/useLibraryVideos";

type LibraryChatGatewayProps = {
  libraryId: string;
};

export function LibraryChatGateway({ libraryId }: LibraryChatGatewayProps) {
  const router = useRouter();
  const videosQuery = useLibraryVideos(libraryId);
  const sessionsQuery = useChatSessions(libraryId);
  const createSessionMutation = useCreateChatSession(libraryId);

  const videosData = videosQuery.data;

  if (!videosData || videosData.counts.ready === 0 || !videosData.isSettled) {
    return null;
  }

  const sessions = [...(sessionsQuery.data ?? [])].sort((a, b) => {
    const aTimestamp = a.lastMessageAt ?? a.createdAt;
    const bTimestamp = b.lastMessageAt ?? b.createdAt;

    return new Date(bTimestamp).getTime() - new Date(aTimestamp).getTime();
  });
  const mostRecentSession = sessions[0] ?? null;

  async function handleNewChat() {
    try {
      const session = await createSessionMutation.mutateAsync();
      router.push(`/library/${libraryId}/chat/${session.id}`);
    } catch {
      toast.error("Could not create chat. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24 text-center">
      <Sparkles size={32} className="mx-auto text-muted-foreground/40" />
      <h1 className="mt-4 text-lg font-semibold">Your library is ready</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask questions across all {videosData.counts.ready} ready{" "}
        {videosData.counts.ready === 1 ? "video" : "videos"}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button
          onClick={() => {
            void handleNewChat();
          }}
          disabled={createSessionMutation.isPending}
        >
          {createSessionMutation.isPending ? "Creating…" : "New chat"}
        </Button>

        {mostRecentSession ? (
          <Button variant="outline" asChild>
            <Link href={`/library/${libraryId}/chat/${mostRecentSession.id}`}>
              Continue last chat
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
