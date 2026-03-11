"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createLibrarySchema,
  type CreateLibraryInput,
} from "@/lib/validation/libraries";
import { createLibrary } from "@/features/libraries/api";
import type { LibraryListItem } from "@/features/libraries/types";

type CreateLibraryFormProps = {
  onCreated: (library: LibraryListItem) => void;
  submitLabel?: string;
};

export function CreateLibraryForm({ onCreated, submitLabel = "Create library" }: CreateLibraryFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<CreateLibraryInput>({
    resolver: zodResolver(createLibrarySchema),
    defaultValues: {
      name: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateLibraryInput) => createLibrary(values.name),
    onSuccess: (library) => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      form.reset();
      onCreated(library);
    },
  });

  function onSubmit(values: CreateLibraryInput) {
    mutation.mutate(values);
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="space-y-1.5">
        <label htmlFor="library-name" className="sr-only">
          Library name
        </label>
        <div className="flex flex-col gap-3">
          <Input
            id="library-name"
            {...form.register("name")}
            placeholder="Research Library"
            maxLength={80}
            aria-invalid={Boolean(form.formState.errors.name)}
            aria-describedby={
              form.formState.errors.name ? "library-name-error" : undefined
            }
          />
          <Button
            className="w-full"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? "Creating..." : submitLabel}
          </Button>
        </div>
        {form.formState.errors.name ? (
          <p id="library-name-error" className="text-sm text-destructive" role="alert">
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
  );
}
