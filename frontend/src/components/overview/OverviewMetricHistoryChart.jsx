import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const formatTimeLabel = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));

const formatDateTimeLabel = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));

export default function OverviewMetricHistoryChart({
  title,
  data,
  unit,
  color = "var(--chart-1)",
}) {
  if (!data.length) {
    return null;
  }

  const chartConfig = {
    value: {
      label: title,
      color,
    },
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-6">{title}</h2>
      <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="event_time"
            tickFormatter={formatTimeLabel}
            tickMargin={12}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            width={72}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}${unit ? ` ${unit}` : ""}`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) => formatDateTimeLabel(label)}
                formatter={(value) => (
                  <>
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: "var(--color-value)" }}
                    />
                    <span className="text-muted-foreground">{title}</span>
                    <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                      {Number(value).toFixed(2)}
                      {unit ? ` ${unit}` : ""}
                    </span>
                  </>
                )}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-value)"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
