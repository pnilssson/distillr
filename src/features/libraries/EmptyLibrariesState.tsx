import { Library } from "lucide-react";

import { CreateLibraryForm } from "@/features/libraries/CreateLibraryForm";

type EmptyLibrariesStateProps = {
  onCreated: (library: { id: string; name: string; createdAt: string }) => void;
};

export function EmptyLibrariesState({ onCreated }: EmptyLibrariesStateProps) {
  return (
    <div className="py-24 text-center">
      <Library size={32} className="mx-auto text-muted-foreground/40" />
      <h2 className="mt-4 text-lg font-semibold">Start your first library</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Collect channels, playlists, or videos and chat across all of them.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          Research a YouTube channel
        </span>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          Follow a creator
        </span>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          Mine a playlist
        </span>
      </div>
      <div className="mt-8 mx-auto max-w-sm">
        <CreateLibraryForm onCreated={onCreated} submitLabel="Create your first library" />
      </div>
    </div>
  );
}
