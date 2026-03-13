import Link from "next/link";

import { Button } from "@/components/ui/button";

interface FinalCtaSectionProps {
  isAuthenticated?: boolean;
}

export function FinalCtaSection({ isAuthenticated }: FinalCtaSectionProps) {
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";
  const ctaLabel = isAuthenticated ? "Go to dashboard" : "Build my first library →";

  return (
    <section className="border-t mx-auto w-full max-w-3xl px-6 py-24 text-center">
      <h2 className="mb-4 font-serif text-4xl leading-tight sm:text-5xl">
        Your next great idea is already on YouTube.
      </h2>
      <p className="mb-10 text-muted-foreground">
        Start building a knowledge base today — free forever.
      </p>
      <Button asChild size="lg">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </section>
  );
}
