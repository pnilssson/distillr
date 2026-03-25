"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AddSourceDialog } from "@/features/sources/AddSourceDialog";
import { createCheckoutSession } from "@/features/billing/api";
import { useBillingState } from "@/features/billing/useBillingState";
import { useSources } from "@/features/sources/useSources";
import { useLibraryVideos } from "@/features/videos/useLibraryVideos";
import { useChatSessions } from "@/features/chat/useChatSessions";
import { useCreateChatSession } from "@/features/chat/useCreateChatSession";
import { LibraryStatsBar } from "@/features/libraries/LibraryStatsBar";
import { SourcesSection } from "@/features/libraries/SourcesSection";
import { ContentSection } from "@/features/libraries/ContentSection";
import { ChatSection } from "@/features/libraries/ChatSection";
import { DeleteLibraryDialog } from "@/features/libraries/DeleteLibraryDialog";
import { RenameLibraryDialog } from "@/features/libraries/RenameLibraryDialog";

type Props = {
  libraryId: string;
  libraryName: string;
};

function FirstRunState({ onAddSource }: { onAddSource: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border bg-card">
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
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const sourcesQuery = useSources(libraryId);
  const videosQuery = useLibraryVideos(libraryId);
  const sessionsQuery = useChatSessions(libraryId);
  const createSessionMutation = useCreateChatSession(libraryId);
  const billingQuery = useBillingState();
  const allowedExportFormats = billingQuery.data?.allowedExportFormats ?? ["txt"];

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

  async function handleUpgradeForExport() {
    try {
      const target = billingQuery.data?.hasTopUpAccess ? "top_up_tier_1" : "builder";
      const url = await createCheckoutSession(target, `/library/${libraryId}`, "export");
      window.location.assign(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start checkout right now.");
    }
  }

  return (
    <main className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Library options">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setShowRename(true)}>
                <Pencil size={14} />
                Rename library
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 size={14} />
                Delete library
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border bg-card px-5 py-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-3 h-7 w-12" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </div>
                ))}
              </div>
            )}

            {/* Chats */}
            <ChatSection
              libraryId={libraryId}
              sessions={sessions}
              isLoading={sessionsQuery.isPending}
              isNewChatPending={createSessionMutation.isPending}
              canChat={(videosQuery.data?.counts.ready ?? 0) > 0}
              onNewChat={handleNewChat}
            />

            {/* Sources */}
            <SourcesSection
              libraryId={libraryId}
              sources={sources}
              isLoading={isSourcesLoading}
            />

            {/* Content */}
            <ContentSection
              libraryId={libraryId}
              videosData={videosQuery.data}
              isLoading={videosQuery.isPending}
              allowedExportFormats={allowedExportFormats}
              onLockedExport={handleUpgradeForExport}
            />
          </div>
        )}
      </div>

      <AddSourceDialog
        libraryId={libraryId}
        open={addSourceOpen}
        onOpenChange={setAddSourceOpen}
      />

      <RenameLibraryDialog
        libraryId={libraryId}
        libraryName={libraryName}
        open={showRename}
        onOpenChange={setShowRename}
      />

      <DeleteLibraryDialog
        libraryId={libraryId}
        libraryName={libraryName}
        open={showDelete}
        onOpenChange={setShowDelete}
      />
    </main>
  );
}
