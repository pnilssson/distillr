import Link from "next/link";

import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  isAuthenticated?: boolean;
}

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";
  const ctaLabel = isAuthenticated ? "Go to dashboard" : "Try it free";

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-24 text-center">
      {/* Badge */}
      <div className="mb-6 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
        Your AI. Your content.
      </div>

      {/* Headline */}
      <h1 className="mb-6 max-w-2xl font-serif text-5xl leading-tight tracking-tight sm:text-6xl lg:text-7xl">
        ChatGPT knows everything.
        <br />
        Distillr knows your library.
      </h1>

      {/* Subheadline */}
      <p className="mb-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Add the YouTube channels and videos you already follow. Ask questions in
        plain language. Get specific answers from your content - not from the
        entire internet.
      </p>

      {/* Social proof hint */}
      <p className="mb-10 text-sm text-muted-foreground">
        Used by researchers, creators, and lifelong learners
      </p>

      {/* CTA */}
      <Button asChild size="lg" className="mb-3">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground">
          Free forever. No credit card needed.
        </p>
      )}

      {/* PLACEHOLDER: Replace with actual app screenshot */}
      <div className="mt-16 w-full max-w-3xl overflow-hidden rounded-2xl border shadow-xl">
        <div className="flex items-center gap-1.5 border-b bg-muted px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-border" />
          <div className="h-3 w-3 rounded-full bg-border" />
          <div className="h-3 w-3 rounded-full bg-border" />
          <span className="ml-2 text-xs text-muted-foreground">
            distillr.app
          </span>
        </div>
        <div className="flex min-h-80 flex-col items-center justify-center bg-muted/20 p-8 text-center">
          <div className="rounded-lg border-2 border-dashed border-border bg-background/50 px-8 py-6">
            <p className="text-sm font-medium text-muted-foreground">
              Screenshot placeholder
            </p>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground/60">
              Replace with: library view showing video list, search bar, and
              sidebar with libraries
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
