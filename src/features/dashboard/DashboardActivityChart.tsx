"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Video } from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardActivityDay } from "@/features/dashboard/types";

const chartConfig = {
  videosAdded: {
    label: "Videos added",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type DashboardActivityChartProps = {
  activityByDay: DashboardActivityDay[];
};

export function DashboardActivityChart({ activityByDay }: DashboardActivityChartProps) {
  const hasAnyData = activityByDay.some((point) => point.videosAdded > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Ingestion activity</CardTitle>
        <CardDescription className="text-xs">Videos added over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasAnyData ? (
          <div className="flex h-[220px] flex-col items-center justify-center text-center">
            <Video size={22} className="text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground">No ingestion activity yet</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart
              accessibilityLayer
              data={activityByDay}
              margin={{ top: 8, right: 0, bottom: 0, left: -14 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={28}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="videosAdded" fill="var(--color-videosAdded)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
