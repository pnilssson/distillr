"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

    const payload = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setRequestError(payload.error ?? "Unable to send magic link.");
      return;
    }

    setStatus(payload.message ?? "Check your inbox for the magic link.");
    form.reset();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Sign in to Distillr</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter your email and we will send a magic link.
        </p>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <Input
            type="email"
            {...form.register("email")}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={Boolean(form.formState.errors.email)}
          />
          <Button
            disabled={form.formState.isSubmitting}
            type="submit"
            className="w-full"
          >
            {form.formState.isSubmitting ? "Sending..." : "Send magic link"}
          </Button>
        </form>
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        ) : null}
        {status ? <p className="text-sm text-primary">{status}</p> : null}
        {requestError ? <p className="text-sm text-destructive">{requestError}</p> : null}
      </CardContent>
    </Card>
  );
}
