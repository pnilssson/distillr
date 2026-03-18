"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddSourceDialog } from "@/features/sources/AddSourceDialog";
import { useSources } from "@/features/sources/useSources";
import { useLibraryVideos } from "@/features/videos/useLibraryVideos";
import { useChatSessions } from "@/features/chat/useChatSessions";
import { useCreateChatSession } from "@/features/chat/useCreateChatSession";
import { LibraryStatsBar } from "@/features/libraries/LibraryStatsBar";
import { SourcesSection } from "@/features/libraries/SourcesSection";
import { ContentSection } from "@/features/libraries/ContentSection";

type Props = {
  libraryId: string;
  libraryName: string;
};

function FirstRunState({ onAddSource }: { onAddSource: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border bg-card shadow-sm">
          <Layers size={20} className="text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">Add your first source</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add YouTube channels, playlists, or videos. Distillr will extract and index the transcripts so you can ask questions across all of them.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {["Research a channel", "Follow a creator", "Distill a playlist"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        <Button className="mt-8 gap-2" onClick={onAddSource}>
          <Plus size={14} aria-hidden="true" />
          Add source
        </Button>
      </div>
    </div>
  );
}

export function LibraryDashboard({ libraryId, libraryName }: Props) {
  const router = useRouter();
  const [addSourceOpen, setAddSourceOpen] = useState(false);

  const sourcesQuery = useSources(libraryId);
  const videosQuery = useLibraryVideos(libraryId);
  const sessionsQuery = useChatSessions(libraryId);
  const createSessionMutation = useCreateChatSession(libraryId);

  const sources = sourcesQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const isSourcesLoading = sourcesQuery.isPending;
  const hasEverLoadedSources = !isSourcesLoading;
  const hasSources = hasEverLoadedSources && sources.length > 0;

  async function handleNewChat() {
    try {
      const session = await createSessionMutation.mutateAsync();
      router.push(`/library/${libraryId}/chat/${session.id}`);
    } catch {
      toast.error("Could not create chat. Please try again.");
    }
  }

  return (
    <main className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {isSourcesLoading ? (
              <Skeleton className="h-7 w-48" />
            ) : (
              <h1 className="truncate text-xl font-semibold">{libraryName}</h1>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Library overview
            </p>
          </div>

          {hasSources ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setAddSourceOpen(true)}
              >
                <Plus size={13} aria-hidden="true" />
                Add source
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => { void handleNewChat(); }}
                disabled={
                  createSessionMutation.isPending ||
                  (videosQuery.data?.counts.ready ?? 0) === 0
                }
              >
                <Sparkles size={13} aria-hidden="true" />
                {createSessionMutation.isPending ? "Starting..." : "New chat"}
              </Button>
            </div>
          ) : null}
        </div>

        {/* First-run empty state */}
        {!isSourcesLoading && !hasSources ? (
          <FirstRunState onAddSource={() => setAddSourceOpen(true)} />
        ) : (
          <div className="space-y-8">
            {/* Stats */}
            {!isSourcesLoading ? (
              <LibraryStatsBar
                sources={sources}
                videosData={videosQuery.data}
                sessions={sessions}
              />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border bg-card px-5 py-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-3 h-7 w-12" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </div>
                ))}
              </div>
            )}

            {/* Sources */}
            <SourcesSection
              libraryId={libraryId}
              sources={sources}
              isLoading={isSourcesLoading}
            />

            {/* Content */}
            <ContentSection
              videosData={videosQuery.data}
              isLoading={videosQuery.isPending}
            />
          </div>
        )}
      </div>

      <AddSourceDialog
        libraryId={libraryId}
        open={addSourceOpen}
        onOpenChange={setAddSourceOpen}
      />
    </main>
  );
}
