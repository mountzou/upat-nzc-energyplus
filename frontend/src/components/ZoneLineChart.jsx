import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  zoneLabelMap,
  getZoneLabel,
  formatDateLabel,
  formatShortDate,
} from "../utils/chartHelpers";

const ZONE_KEYS = Object.keys(zoneLabelMap);

const cardStyle = {
  padding: "1rem",
  border: "1px solid #ddd",
  borderRadius: "10px",
  background: "#fff",
};

export default function ZoneLineChart({ title, data, unit, decimals = 2 }) {
  return (
    <div style={cardStyle}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ width: "100%", height: 360 }}>
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
              formatter={(value, name) => [
                `${Number(value).toFixed(decimals)} ${unit}`,
                getZoneLabel(name),
              ]}
            />
            {ZONE_KEYS.map((zone) => (
              <Line
                key={zone}
                type="monotone"
                dataKey={zone}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
