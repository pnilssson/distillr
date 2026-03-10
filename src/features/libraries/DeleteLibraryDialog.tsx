"use client";

import { useState } from "react";
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
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    await fetch(`/api/libraries/${libraryId}`, { method: "DELETE" });

    onOpenChange(false);
    setIsDeleting(false);

    if (pathname === `/library/${libraryId}`) {
      router.push("/dashboard");
    }

    router.refresh();
  }

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
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete library"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
