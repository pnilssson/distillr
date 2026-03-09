"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LibraryListItem } from "@/features/libraries/types";

type LibraryListProps = {
  libraries: LibraryListItem[];
  onDelete: (libraryId: string) => Promise<void>;
};

export function LibraryList({ libraries, onDelete }: LibraryListProps) {
  return (
    <div className="grid gap-3">
      {libraries.map((library) => (
        <Card key={library.id}>
          <CardHeader>
            <CardTitle className="text-lg">{library.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">0 videos</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(library.id)}
            >
              Delete
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
