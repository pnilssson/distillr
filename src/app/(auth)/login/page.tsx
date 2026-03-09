import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LoginForm } from "@/features/auth/LoginForm";
import { MarketingNav } from "@/features/navigation/MarketingNav";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav>
        <Button asChild size="sm" variant="ghost">
          <Link href="/">Home</Link>
        </Button>
      </MarketingNav>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll send a magic link to your inbox.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
