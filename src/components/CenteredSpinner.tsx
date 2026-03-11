import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type CenteredSpinnerProps = {
  label?: string;
  className?: string;
};

export function CenteredSpinner({
  label = "Loading",
  className,
}: CenteredSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-1 items-center justify-center p-6", className)}
    >
      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
