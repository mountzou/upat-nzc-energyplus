import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDateLabel, formatShortDate } from "@/utils/chartHelpers";

export default function MultiLineChart({
  title,
  data,
  series,
  unit = "kWh",
  decimals = 2,
}) {
  if (!series.length || !data.length) {
    return null;
  }

  const chartConfig = Object.fromEntries(
    series.map((item, index) => [
      item.key,
      {
        label: item.label,
        color: `var(--chart-${(index % 5) + 1})`,
      },
    ])
  );

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-2">{title}</h2>
      <ChartContainer config={chartConfig} className="aspect-auto h-[360px] w-full">
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
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stroke={`var(--color-${item.key})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
