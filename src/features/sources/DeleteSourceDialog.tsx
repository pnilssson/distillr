"use client";

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
import { useDeleteSource } from "@/features/sources/useDeleteSource";

type DeleteSourceDialogProps = {
  libraryId: string;
  sourceId: string;
  sourceLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteSourceDialog({
  libraryId,
  sourceId,
  sourceLabel,
  open,
  onOpenChange,
}: DeleteSourceDialogProps) {
  const mutation = useDeleteSource();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this source?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the source and all videos ingested from it. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <p className="text-xs text-muted-foreground truncate" title={sourceLabel}>
          {sourceLabel}
        </p>

        {mutation.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {mutation.error.message}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              mutation.mutate(
                { libraryId, sourceId },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                  },
                },
              );
            }}
            disabled={mutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? "Deleting..." : "Delete source"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
