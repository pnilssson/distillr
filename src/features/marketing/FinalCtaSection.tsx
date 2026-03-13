import Link from "next/link";

import { Button } from "@/components/ui/button";

interface FinalCtaSectionProps {
  isAuthenticated?: boolean;
}

export function FinalCtaSection({ isAuthenticated }: FinalCtaSectionProps) {
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";
  const ctaLabel = isAuthenticated ? "Go to dashboard" : "Try it free";

  return (
    <section className="border-t mx-auto w-full max-w-3xl px-6 py-24 text-center lg:py-36">
      <h2 className="mb-4 font-serif text-4xl leading-tight sm:text-5xl">
        Ask your YouTube library anything.
      </h2>
      <p className="mb-10 text-muted-foreground">
        Free to start. Add your first channel or video in under a minute.
      </p>
      <Button asChild size="lg">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </section>
  );
}
