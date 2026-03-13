import Link from "next/link";

import { Button } from "@/components/ui/button";

interface MarketingNavProps {
  isAuthenticated?: boolean;
  children?: React.ReactNode;
}

export function MarketingNav({ isAuthenticated, children }: MarketingNavProps) {
  return (
    <div className="px-4 pt-4">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-xl border bg-card px-5 py-3">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          Distillr
        </Link>
        {children ? (
          <div className="flex items-center gap-2">{children}</div>
        ) : (
          <div className="flex items-center gap-6">
            {!isAuthenticated && (
              <Link
                href="#pricing"
                className="hidden text-sm text-muted-foreground hover:text-foreground transition-colors sm:block"
              >
                Pricing
              </Link>
            )}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Button asChild size="sm">
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/login">Get started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
