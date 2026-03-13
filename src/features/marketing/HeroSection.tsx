import Link from "next/link";

import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  isAuthenticated?: boolean;
}

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";
  const ctaLabel = isAuthenticated ? "Go to dashboard" : "Build my first library →";

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-24 text-center">
      {/* Badge */}
      <div className="mb-6 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
        Second brain for video
      </div>

      {/* Headline */}
      <h1 className="mb-6 max-w-2xl font-serif text-5xl leading-tight tracking-tight sm:text-6xl lg:text-7xl">
        Stop watching.
        <br />
        Start knowing.
      </h1>

      {/* Subheadline */}
      <p className="mb-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Distillr turns YouTube channels, playlists, and videos into a searchable
        knowledge base you can chat with and export from.
      </p>

      {/* Social proof hint */}
      <p className="mb-10 text-sm text-muted-foreground">
        Trusted by researchers, creators, and lifelong learners
      </p>

      {/* CTA */}
      <Button asChild size="lg" className="mb-3">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground">
          Free to start · No credit card required
        </p>
      )}

      {/* Product UI Mockup */}
      <div className="mt-16 w-full max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-xl">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b bg-muted px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-border" />
          <div className="h-3 w-3 rounded-full bg-border" />
          <div className="h-3 w-3 rounded-full bg-border" />
          <span className="ml-2 text-xs text-muted-foreground">
            distillr.app/library/ai-research
          </span>
        </div>
        {/* Mockup body */}
        <div className="flex min-h-64 divide-x">
          {/* Sidebar */}
          <div className="w-44 shrink-0 space-y-1 bg-muted/40 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Libraries
            </p>
            {[
              { name: "AI Research", active: true },
              { name: "Marketing", active: false },
              { name: "Dev Talks", active: false },
            ].map(({ name, active }) => (
              <div
                key={name}
                className={`rounded px-2 py-1.5 text-xs ${
                  active
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {name}
              </div>
            ))}
          </div>
          {/* Main content */}
          <div className="flex-1 space-y-2 p-4">
            <p className="mb-3 text-xs font-medium">AI Research · 24 videos</p>
            {[
              "How GPT-4 Works — Andrej Karpathy",
              "The Illustrated Transformer",
              "Attention Is All You Need — Explained",
            ].map((v) => (
              <div
                key={v}
                className="flex items-center gap-3 rounded border bg-muted/30 p-2 text-xs"
              >
                <div className="h-8 w-12 shrink-0 rounded bg-muted" />
                <span className="truncate text-muted-foreground">{v}</span>
              </div>
            ))}
            {/* Chat hint */}
            <div className="mt-3 rounded-lg border bg-primary/10 px-3 py-2 text-xs text-muted-foreground">
              💬 &ldquo;What did Karpathy say about attention mechanisms?&rdquo;
              &mdash;{" "}
              <span className="font-medium text-foreground">3 sources found</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
