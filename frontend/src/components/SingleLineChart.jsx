import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { formatDateLabel, formatShortDate } from "../utils/chartHelpers";

const cardStyle = {
  padding: "1rem",
  border: "1px solid #ddd",
  borderRadius: "10px",
  background: "#fff",
};

export default function SingleLineChart({
  title,
  data,
  dataKey = "kwh",
  unit = "kWh",
  decimals = 2,
}) {
  return (
    <div style={cardStyle}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              minTickGap={24}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => formatDateLabel(value)}
              formatter={(value) => [
                `${Number(value).toFixed(decimals)} ${unit}`,
                title,
              ]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
