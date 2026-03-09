import Link from "next/link";

export function MarketingNav({ children }: { children?: React.ReactNode }) {
  return (
    <div className="px-4 pt-4">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-xl border bg-card px-5 py-3">
      <Link
        href="/"
        className="text-base font-semibold tracking-tight hover:opacity-80 transition-opacity"
      >
        Distillr
      </Link>
      {children}
      </nav>
    </div>
  );
}
