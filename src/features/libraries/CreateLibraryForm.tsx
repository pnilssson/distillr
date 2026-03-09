"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createLibrarySchema,
  type CreateLibraryInput,
} from "@/lib/validation/libraries";

type CreateLibraryFormProps = {
  onCreated: (library: { id: string; name: string; createdAt: string }) => void;
};

export function CreateLibraryForm({ onCreated }: CreateLibraryFormProps) {
  const form = useForm<CreateLibraryInput>({
    resolver: zodResolver(createLibrarySchema),
    defaultValues: {
      name: "",
    },
  });
  const [requestError, setRequestError] = useState<string | null>(null);

  async function onSubmit(values: CreateLibraryInput) {
    setRequestError(null);

    const response = await fetch("/api/libraries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload = (await response.json()) as
      | { library: { id: string; name: string; createdAt: string } }
      | { error: string };

    if (!response.ok || !("library" in payload)) {
      const errorMessage =
        "error" in payload ? payload.error : "Unable to create library.";
      setRequestError(errorMessage);
      return;
    }

    onCreated(payload.library);
    form.reset();
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          {...form.register("name")}
          placeholder="Research Library"
          maxLength={80}
          aria-invalid={Boolean(form.formState.errors.name)}
        />
        <Button
          className="sm:min-w-40"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? "Creating..." : "Create your first library"}
        </Button>
      </div>
      {form.formState.errors.name ? (
        <p className="text-sm text-destructive">
          {form.formState.errors.name.message}
        </p>
      ) : null}
      {requestError ? <p className="text-sm text-destructive">{requestError}</p> : null}
    </form>
  );
}
