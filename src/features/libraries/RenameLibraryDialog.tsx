"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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
import { useRenameLibrary } from "@/features/libraries/useRenameLibrary";

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
  const form = useForm<CreateLibraryInput>({
    resolver: zodResolver(createLibrarySchema),
    defaultValues: { name: libraryName },
  });

  const mutation = useRenameLibrary();

  function onSubmit(values: CreateLibraryInput) {
    mutation.mutate(
      { libraryId, name: values.name },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      form.reset({ name: libraryName });
      mutation.reset();
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
                disabled={mutation.isPending}
                type="submit"
              >
                {mutation.isPending ? "Renaming..." : "Rename library"}
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
          {mutation.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
