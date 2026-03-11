"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

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
import { deleteSource } from "@/features/sources/api";

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
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteSource(libraryId, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", libraryId] });
      onOpenChange(false);
    },
  });

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
            onClick={() => mutation.mutate()}
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
