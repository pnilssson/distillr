"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { Zap } from "lucide-react";

import { getBillingPlanSpec } from "@/lib/billing/plans";
import type { BillingState } from "@/lib/billing/types";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const chartConfig = {
  credits: {
    label: "Credits remaining",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type DashboardCreditsCardProps = {
  billing: BillingState;
};

export function DashboardCreditsCard({ billing }: DashboardCreditsCardProps) {
  const planSpec = getBillingPlanSpec(billing.plan);
  const maxCredits = planSpec.monthlyChatCredits;
  const maxMonthlyVideos = planSpec.monthlyVideoLimit;

  const hasBillingSnapshot =
    billing.billingEnabled &&
    billing.chatCreditsBalance !== null &&
    billing.monthlyVideoBalance !== null;

  if (!hasBillingSnapshot) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Credits</CardTitle>
          <CardDescription className="text-xs">
            {planSpec.label} plan - billing details unavailable right now
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
            We could not load usage balances for this account. Limits still apply during chat and
            ingestion.
          </div>
        </CardContent>
      </Card>
    );
  }

  const remainingCredits = Math.max(billing.chatCreditsBalance ?? 0, 0);
  const creditsPercent = clampPercentage((remainingCredits / maxCredits) * 100);

  const remainingVideos = Math.max(billing.monthlyVideoBalance ?? 0, 0);
  const remainingVideosPercent = clampPercentage((remainingVideos / maxMonthlyVideos) * 100);

  const chartData = [{ credits: creditsPercent, fill: "var(--color-credits)" }];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Credits</CardTitle>
        <CardDescription className="text-xs">
          {planSpec.label} plan - chat and ingestion limits
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-4">
          <div className="relative mx-auto flex w-[170px] items-center justify-center">
            <ChartContainer
              config={chartConfig}
              className="h-[170px] w-[170px]"
              aria-label={`${remainingCredits} of ${maxCredits} chat credits remaining`}
            >
              <RadialBarChart
                data={chartData}
                innerRadius="72%"
                outerRadius="92%"
                startAngle={90}
                endAngle={-270}
                barSize={11}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="credits"
                  background={{ fill: "var(--muted)" }}
                  cornerRadius={8}
                />
              </RadialBarChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] leading-none font-semibold tabular-nums">
                {remainingCredits.toLocaleString()}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">of {maxCredits}</span>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Zap size={11} /> Monthly indexing allowance
              </span>
              <span className="text-xs tabular-nums">
                {remainingVideos} / {maxMonthlyVideos}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={remainingVideosPercent}
              aria-label="Monthly indexing allowance remaining"
            >
              <div
                className="h-full rounded-full bg-[var(--chart-1)] transition-all"
                style={{ width: `${remainingVideosPercent}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
