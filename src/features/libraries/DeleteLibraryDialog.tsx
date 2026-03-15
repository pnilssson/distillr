"use client";

import { usePathname, useRouter } from "next/navigation";

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
import { useDeleteLibrary } from "@/features/libraries/useDeleteLibrary";

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
  const mutation = useDeleteLibrary();

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
            onClick={() => {
              mutation.mutate(
                { libraryId },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    if (pathname === `/library/${libraryId}`) {
                      router.push("/dashboard");
                    }
                  },
                },
              );
            }}
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
