import { Card, CardContent } from "@/components/ui/card";

type OverviewStatCardProps = {
  label: string;
  value: number | string;
  sublabel?: string;
  icon: React.ReactNode;
};

export function OverviewStatCard({ label, value, sublabel, icon }: OverviewStatCardProps) {
  return (
    <Card className="py-0">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-3xl leading-none font-semibold tabular-nums">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {sublabel ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{sublabel}</p>
            ) : null}
          </div>
          <div className="mt-0.5 shrink-0 text-muted-foreground/45">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
