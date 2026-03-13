import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const resultEnergyLabels = {
  electricity_facility: "Facility electricity",
  heating_diesel: "Heating diesel",
  cooling_electricity: "Cooling electricity",
  interiorlights_electricity: "Lighting",
  interiorequipment_electricity: "Equipment",
  pumps_electricity: "Pumps",
  fans_electricity: "Fans",
};

const DIESEL_GJ_PER_LITER = 0.0386;
const GJ_TO_KWH = 277.7777777778;
const DIESEL_KWH_PER_LITER = DIESEL_GJ_PER_LITER * GJ_TO_KWH;

const formatNumber = (value, digits = 1) =>
  typeof value === "number" ? value.toFixed(digits) : "n/a";

const getDieselLiters = (value) => {
  if (typeof value?.liters === "number" && Number.isFinite(value.liters)) {
    return value.liters;
  }

  if (typeof value?.kwh === "number" && Number.isFinite(value.kwh)) {
    return value.kwh / DIESEL_KWH_PER_LITER;
  }

  return null;
};

const formatEnergyValue = (key, value) => {
  if (key === "heating_diesel") {
    return `${formatNumber(getDieselLiters(value), 2)} L`;
  }

  return `${formatNumber(value?.kwh, 2)} kWh`;
};

const getRoomSummaryRows = (roomRun) => {
  const results = roomRun.results || {};
  const periodInfo = results.period_info || {};
  const zoneTemp = results.zone_temperature_summary?.[0];
  const zoneOccupancy = results.zone_occupancy_summary?.[0];
  const thermalComfort = results.thermal_comfort_summary?.[0];
  const energySummary = results.energy_summary || {};

  const energyRows = Object.entries(energySummary)
    .slice(0, 4)
    .map(([key, value]) => ({
      label: resultEnergyLabels[key] || key,
      value: formatEnergyValue(key, value),
    }));

  return {
    period: periodInfo.start_date && periodInfo.end_date
      ? `${periodInfo.start_date} to ${periodInfo.end_date}`
      : null,
    avgTemp: zoneTemp?.avg_mean_air_temperature_c,
    avgOccupancy: zoneOccupancy?.avg_occupant_count,
    discomfortHours: thermalComfort?.not_comfortable_hours,
    energyRows,
  };
};

export default function RoomResultCard({ roomRun }) {
  const summary = roomRun.execution?.success ? getRoomSummaryRows(roomRun) : null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{roomRun.room_label}</span>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
            <span
              className={
                roomRun.status === "success"
                  ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700"
                  : "rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 font-medium text-destructive"
              }
            >
              {roomRun.status}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {roomRun.error && (
          <p className="text-sm text-destructive">{roomRun.error}</p>
        )}
        {roomRun.execution?.success === false && !roomRun.error && (
          <p className="text-sm text-muted-foreground">
            The backend accepted the room payload, but the EnergyPlus process
            failed during execution.
          </p>
        )}
        {summary && (
          <div className="grid gap-2 text-sm">
            {summary.period && (
              <div className="rounded-md bg-muted/50 px-2 py-1">
                <span className="text-muted-foreground">Period: </span>
                <strong>{summary.period}</strong>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-muted/50 px-2 py-1">
                <div className="text-xs text-muted-foreground">Avg temp</div>
                <div className="font-semibold">
                  {formatNumber(summary.avgTemp, 2)} °C
                </div>
              </div>
              <div className="rounded-md bg-muted/50 px-2 py-1">
                <div className="text-xs text-muted-foreground">
                  Avg occupancy
                </div>
                <div className="font-semibold">
                  {formatNumber(summary.avgOccupancy, 2)}
                </div>
              </div>
            </div>
            <div className="rounded-md bg-muted/50 px-2 py-1">
              <div className="text-xs text-muted-foreground">
                Thermal discomfort
              </div>
              <div className="font-semibold">
                {formatNumber(summary.discomfortHours, 2)} h
              </div>
            </div>
            {summary.energyRows.length > 0 && (
              <div className="grid gap-1 rounded-md bg-muted/50 p-2">
                <div className="text-xs text-muted-foreground">
                  Energy summary
                </div>
                {summary.energyRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
