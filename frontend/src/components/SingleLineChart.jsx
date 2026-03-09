import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDateLabel, formatShortDate } from "../utils/chartHelpers";

export default function SingleLineChart({
  title,
  data,
  dataKey = "kwh",
  unit = "kWh",
  decimals = 2,
}) {
  const chartConfig = {
    [dataKey]: {
      label: title,
      color: "var(--chart-1)",
    },
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-2">{title}</h2>
      <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
        <LineChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            minTickGap={24}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value} ${unit}`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatDateLabel(value)}
                formatter={(value, name) => (
                  <>
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: `var(--color-${name})` }}
                    />
                    <span className="text-muted-foreground">
                      {chartConfig[name]?.label || name}
                    </span>
                    <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                      {Number(value).toFixed(decimals)} {unit}
                    </span>
                  </>
                )}
              />
            }
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={`var(--color-${dataKey})`}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
