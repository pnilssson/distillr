import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CreateLibraryForm } from "@/features/libraries/CreateLibraryForm";

type EmptyLibrariesStateProps = {
  onCreated: (library: { id: string; name: string; createdAt: string }) => void;
};

export function EmptyLibrariesState({ onCreated }: EmptyLibrariesStateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your first library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base text-muted-foreground">
          Start with a name. You can add channels, playlists, or videos right
          after.
        </p>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="rounded-full border px-3 py-1">
            Research a YouTube channel
          </span>
          <span className="rounded-full border px-3 py-1">
            Follow a creator
          </span>
          <span className="rounded-full border px-3 py-1">Mine a playlist</span>
        </div>
        <CreateLibraryForm onCreated={onCreated} />
      </CardContent>
    </Card>
  );
}
