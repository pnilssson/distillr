import Link from "next/link";

import { Button } from "@/components/ui/button";

interface MarketingNavProps {
  isAuthenticated?: boolean;
  children?: React.ReactNode;
}

export function MarketingNav({ isAuthenticated, children }: MarketingNavProps) {
  const showCenterLinks = !children && !isAuthenticated;

  return (
    <div className="sticky top-0 z-50 px-4 pt-4">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-xl border bg-card/80 px-5 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          Distillr
        </Link>

        {showCenterLinks && (
          <div className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
            <a
              href="#how-it-works"
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#features"
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
            >
              Pricing
            </a>
          </div>
        )}

        {children ? (
          <div className="flex items-center gap-2">{children}</div>
        ) : (
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
        )}
      </nav>
    </div>
  );
}
