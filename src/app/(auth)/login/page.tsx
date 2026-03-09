import Link from "next/link";

import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          Distillr
        </Link>

        <div className="mt-10">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll send a magic link to your inbox.
          </p>
        </div>

        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
