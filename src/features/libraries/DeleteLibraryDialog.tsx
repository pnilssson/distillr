"use client";

import { usePathname, useRouter } from "next/navigation";
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
import { deleteLibrary } from "@/features/libraries/api";

type DeleteLibraryDialogProps = {
  libraryId: string;
  libraryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteLibraryDialog({
  libraryId,
  libraryName,
  open,
  onOpenChange,
}: DeleteLibraryDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteLibrary(libraryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      onOpenChange(false);
      if (pathname === `/library/${libraryId}`) {
        router.push("/dashboard");
      }
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{libraryName}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the library and all its sources, videos,
            and chat history. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? "Deleting..." : "Delete library"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
