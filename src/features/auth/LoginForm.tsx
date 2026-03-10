"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
  const [status, setStatus] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function onSubmit(values: LoginEmailInput) {
    setRequestError(null);
    setStatus(null);

    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload = (await response.json()) as {
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      setRequestError(payload.error ?? "Unable to send magic link.");
      return;
    }

    setStatus(payload.message ?? "Check your inbox for the magic link.");
    form.reset();
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
        disabled={form.formState.isSubmitting}
        type="submit"
        className="w-full"
      >
        {form.formState.isSubmitting ? "Sending..." : "Send magic link"}
      </Button>
      {status ? (
        <p className="text-sm" role="status">
          {status}
        </p>
      ) : null}
      {requestError ? (
        <p className="text-sm text-destructive" role="alert">
          {requestError}
        </p>
      ) : null}
    </form>
  );
}
