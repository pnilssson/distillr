"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LibraryListItem } from "@/features/libraries/types";

type LibraryListProps = {
  libraries: LibraryListItem[];
  onDelete: (libraryId: string) => Promise<void>;
};

export function LibraryList({ libraries, onDelete }: LibraryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmLibrary, setConfirmLibrary] = useState<LibraryListItem | null>(null);

  async function handleConfirmDelete() {
    if (!confirmLibrary) return;
    setDeletingId(confirmLibrary.id);
    await onDelete(confirmLibrary.id);
    setDeletingId(null);
    setConfirmLibrary(null);
  }

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {libraries.map((library) => (
          <li
            key={library.id}
            className="group flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm font-medium">{library.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">0 videos</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Options for ${library.name}`}
                  >
                    <MoreHorizontal size={15} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmLibrary(library)}
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog
        open={confirmLibrary !== null}
        onOpenChange={(open) => { if (!open) setConfirmLibrary(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{confirmLibrary?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the library and all its videos and chat
              history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingId === confirmLibrary?.id}
              onClick={handleConfirmDelete}
            >
              {deletingId === confirmLibrary?.id ? "Deleting..." : "Delete library"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
