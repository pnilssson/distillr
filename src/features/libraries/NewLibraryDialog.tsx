"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateLibraryForm } from "@/features/libraries/CreateLibraryForm";
import { LibraryListItem } from "@/features/libraries/types";

type NewLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewLibraryDialog({ open, onOpenChange }: NewLibraryDialogProps) {
  const router = useRouter();

  function handleCreated(_library: LibraryListItem) {
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New library</DialogTitle>
        </DialogHeader>
        <CreateLibraryForm onCreated={handleCreated} />
      </DialogContent>
    </Dialog>
  );
}
