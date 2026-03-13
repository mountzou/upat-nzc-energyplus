import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const energyLabelOrder = [
  "electricity_facility",
  "heating_diesel",
  "cooling_electricity",
  "interiorlights_electricity",
  "interiorequipment_electricity",
  "pumps_electricity",
  "fans_electricity",
];

const energyLabels = {
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
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "n/a";

const getDieselLiters = (value) => {
  if (typeof value?.liters === "number" && Number.isFinite(value.liters)) {
    return value.liters;
  }

  if (typeof value?.kwh === "number" && Number.isFinite(value.kwh)) {
    return value.kwh / DIESEL_KWH_PER_LITER;
  }

  return null;
};

const formatEnergyRowValue = (row) => {
  if (row.key === "heating_diesel") {
    return `${formatNumber(getDieselLiters(row), 2)} L`;
  }

  return `${formatNumber(row.value, 2)} kWh`;
};

const buildSchoolSummary = (simulationResult) => {
  const roomRuns = simulationResult?.room_runs || [];
  const successfulRoomRuns = roomRuns.filter((roomRun) => roomRun?.execution?.success);
  const successfulCount = successfulRoomRuns.length;
  const failedCount = roomRuns.length - successfulCount;

  const totalDiscomfortRoomHours = successfulRoomRuns.reduce((sum, roomRun) => {
    const discomfort =
      roomRun.results?.thermal_comfort_summary?.[0]?.not_comfortable_hours;
    return sum + (typeof discomfort === "number" ? discomfort : 0);
  }, 0);

  const totalAverageOccupancy = successfulRoomRuns.reduce((sum, roomRun) => {
    const occupancy = roomRun.results?.zone_occupancy_summary?.[0]?.avg_occupant_count;
    return sum + (typeof occupancy === "number" ? occupancy : 0);
  }, 0);

  const aggregatedEnergy = successfulRoomRuns.reduce((totals, roomRun) => {
    const energySummary = roomRun.results?.energy_summary || {};

    Object.entries(energySummary).forEach(([key, value]) => {
      const currentTotal = totals[key] || { kwh: 0, liters: 0 };
      const nextKwh = typeof value?.kwh === "number" ? value.kwh : 0;
      const nextLiters = getDieselLiters(value) ?? 0;
      totals[key] = {
        kwh: currentTotal.kwh + nextKwh,
        liters: currentTotal.liters + nextLiters,
      };
    });

    return totals;
  }, {});

  const energyRows = [
    ...energyLabelOrder.filter((key) => key in aggregatedEnergy),
    ...Object.keys(aggregatedEnergy).filter((key) => !energyLabelOrder.includes(key)),
  ].map((key) => ({
    key,
    label: energyLabels[key] || key,
    value: aggregatedEnergy[key]?.kwh,
    liters: aggregatedEnergy[key]?.liters,
  }));

  const firstPeriod = successfulRoomRuns[0]?.results?.period_info || {};
  const period =
    firstPeriod.start_date && firstPeriod.end_date
      ? `${firstPeriod.start_date} to ${firstPeriod.end_date}`
      : null;

  return {
    period,
    requestedRooms: roomRuns.length,
    successfulRooms: successfulCount,
    failedRooms: failedCount,
    totalDiscomfortRoomHours,
    avgDiscomfortPerRoom:
      successfulCount > 0 ? totalDiscomfortRoomHours / successfulCount : null,
    totalAverageOccupancy,
    energyRows,
  };
};

export default function SchoolSummaryCard({ simulationResult }) {
  const summary = buildSchoolSummary(simulationResult);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>School Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md bg-muted/50 px-2 py-1">
            <div className="text-xs text-muted-foreground">Period</div>
            <div className="font-semibold">
              {summary.period || "n/a"}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1">
            <div className="text-xs text-muted-foreground">Successful rooms</div>
            <div className="font-semibold">
              {summary.successfulRooms} / {summary.requestedRooms}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1">
            <div className="text-xs text-muted-foreground">Failed rooms</div>
            <div className="font-semibold">{summary.failedRooms}</div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md bg-muted/50 px-2 py-1">
            <div className="text-xs text-muted-foreground">
              Thermal discomfort
            </div>
            <div className="font-semibold">
              {formatNumber(summary.totalDiscomfortRoomHours, 2)} room-h
            </div>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1">
            <div className="text-xs text-muted-foreground">
              Avg discomfort / room
            </div>
            <div className="font-semibold">
              {formatNumber(summary.avgDiscomfortPerRoom, 2)} h
            </div>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1">
            <div className="text-xs text-muted-foreground">
              Total average occupancy
            </div>
            <div className="font-semibold">
              {formatNumber(summary.totalAverageOccupancy, 2)}
            </div>
          </div>
        </div>

        {summary.energyRows.length > 0 && (
          <div className="grid gap-2 rounded-md bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground">Energy summary</div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {summary.energyRows.map((row) => (
                <div key={row.key} className="rounded-md bg-muted/50 px-2 py-1">
                  <div className="text-xs text-muted-foreground">{row.label}</div>
                  <div className="font-semibold">
                    {formatEnergyRowValue(row)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
