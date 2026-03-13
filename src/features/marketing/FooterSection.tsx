import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
        <span className="font-semibold tracking-tight text-foreground">
          Distillr
        </span>
        <div className="flex gap-6">
          <Link
            href="#pricing"
            className="hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
