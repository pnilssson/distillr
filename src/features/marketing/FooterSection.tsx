import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
        <span className="font-semibold tracking-tight text-foreground">
          Distillr
        </span>
        <div className="flex flex-wrap gap-6">
          <Link
            href="#how-it-works"
            className="transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
