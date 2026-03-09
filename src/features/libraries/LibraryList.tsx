"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LibraryListItem } from "@/features/libraries/types";

type LibraryListProps = {
  libraries: LibraryListItem[];
  onDelete: (libraryId: string) => Promise<void>;
};

export function LibraryList({ libraries, onDelete }: LibraryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleConfirmDelete(libraryId: string) {
    setDeletingId(libraryId);
    await onDelete(libraryId);
    setDeletingId(null);
  }

  return (
    <div className="grid gap-3">
      {libraries.map((library) => (
        <Card key={library.id}>
          <CardHeader>
            <CardTitle className="text-lg">{library.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">0 videos</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" aria-label={`Delete ${library.name}`}>
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &quot;{library.name}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the library and all its videos and chat
                    history. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deletingId === library.id}
                    onClick={() => handleConfirmDelete(library.id)}
                  >
                    {deletingId === library.id ? "Deleting..." : "Delete library"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
