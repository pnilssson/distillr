"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createLibrarySchema,
  type CreateLibraryInput,
} from "@/lib/validation/libraries";

type RenameLibraryDialogProps = {
  libraryId: string;
  libraryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RenameLibraryDialog({
  libraryId,
  libraryName,
  open,
  onOpenChange,
}: RenameLibraryDialogProps) {
  const router = useRouter();
  const form = useForm<CreateLibraryInput>({
    resolver: zodResolver(createLibrarySchema),
    defaultValues: { name: libraryName },
  });
  const [requestError, setRequestError] = useState<string | null>(null);

  async function onSubmit(values: CreateLibraryInput) {
    setRequestError(null);

    const response = await fetch(`/api/libraries/${libraryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const payload = (await response.json()) as
      | { library: { id: string; name: string } }
      | { error: string };

    if (!response.ok || !("library" in payload)) {
      const errorMessage =
        "error" in payload ? payload.error : "Unable to rename library.";
      setRequestError(errorMessage);
      return;
    }

    onOpenChange(false);
    router.refresh();
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      form.reset({ name: libraryName });
      setRequestError(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename library</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="rename-library-name" className="sr-only">
              Library name
            </label>
            <div className="flex flex-col gap-3">
              <Input
                id="rename-library-name"
                {...form.register("name")}
                maxLength={80}
                aria-invalid={Boolean(form.formState.errors.name)}
                aria-describedby={
                  form.formState.errors.name
                    ? "rename-library-name-error"
                    : undefined
                }
              />
              <Button
                className="w-full"
                disabled={form.formState.isSubmitting}
                type="submit"
              >
                {form.formState.isSubmitting ? "Renaming..." : "Rename library"}
              </Button>
            </div>
            {form.formState.errors.name ? (
              <p
                id="rename-library-name-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          {requestError ? (
            <p className="text-sm text-destructive" role="alert">
              {requestError}
            </p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
