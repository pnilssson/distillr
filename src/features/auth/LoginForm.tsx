"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginEmailSchema, type LoginEmailInput } from "@/lib/validation/auth";

export function LoginForm() {
  const form = useForm<LoginEmailInput>({
    resolver: zodResolver(loginEmailSchema),
    defaultValues: {
      email: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: LoginEmailInput) => {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send magic link.");
      }
      return payload;
    },
    onSuccess: () => form.reset(),
  });

  function onSubmit(values: LoginEmailInput) {
    mutation.mutate(values);
  }

  return (
    <form
      className="space-y-3 w-full"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={Boolean(form.formState.errors.email)}
          aria-describedby={
            form.formState.errors.email ? "email-error" : undefined
          }
        />
        {form.formState.errors.email ? (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>
      <Button
        disabled={mutation.isPending}
        type="submit"
        className="w-full"
      >
        {mutation.isPending ? "Sending..." : "Send magic link"}
      </Button>
      {mutation.isSuccess ? (
        <p className="text-sm" role="status">
          {mutation.data.message ?? "Check your inbox for the magic link."}
        </p>
      ) : null}
      {mutation.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {mutation.error.message}
        </p>
      ) : null}
    </form>
  );
}
