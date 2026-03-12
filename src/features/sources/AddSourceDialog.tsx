"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addSourceSchema, type AddSourceInput } from "@/lib/validation/sources";
import { addSource } from "@/features/sources/api";

type AddSourceDialogProps = {
  libraryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddSourceDialog({ libraryId, open, onOpenChange }: AddSourceDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<AddSourceInput>({
    resolver: zodResolver(addSourceSchema),
    defaultValues: { url: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: AddSourceInput) => addSource(libraryId, values.url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", libraryId] });
      queryClient.invalidateQueries({ queryKey: ["videos", libraryId] });
      form.reset();
      onOpenChange(false);
      toast.success("Source added.");
    },
  });

  function onSubmit(values: AddSourceInput) {
    mutation.mutate(values);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add YouTube source</DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="source-url" className="text-sm font-medium">
              YouTube URL
            </label>
            <Input
              id="source-url"
              {...form.register("url")}
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
              aria-invalid={Boolean(form.formState.errors.url)}
              aria-describedby={form.formState.errors.url ? "source-url-error" : undefined}
            />
            {form.formState.errors.url ? (
              <p id="source-url-error" className="text-sm text-destructive" role="alert">
                {form.formState.errors.url.message}
              </p>
            ) : null}
          </div>

          {mutation.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {mutation.error.message}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Paste a YouTube video, playlist, or channel URL.
          </p>

          <Button className="w-full" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Adding..." : "Add source"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
