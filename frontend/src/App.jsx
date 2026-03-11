import { useEffect, useState } from "react";

import MultiSeriesLineChart from "@/components/MultiSeriesLineChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputNumber } from "@/components/ui/input-number";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { buildRoomSeriesChart } from "@/utils/chartHelpers";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const buildInitialRoomConfigs = (rooms) =>
  Object.fromEntries(
    rooms.map((room) => [
      room.id,
      {
        enabled: false,
        occupancy: room.defaults.occupancy,
        heating_setpoint: room.defaults.heating_setpoint,
        cooling_setpoint: room.defaults.cooling_setpoint,
      },
    ])
  );

const scheduleLabels = {
  occupancy: "Occupancy",
  lighting: "Lighting",
  equipment: "Equipment",
  heating_availability: "Heating availability",
  hvac_availability: "HVAC availability",
  thermostat_control: "Thermostat control",
  secondary_thermostat_control: "Secondary control",
  ventilation: "Ventilation",
  activity: "Activity",
  heating_setpoint: "Heating setpoint",
  cooling_setpoint: "Cooling setpoint",
  outdoor_co2: "Outdoor CO2",
};

const resultEnergyLabels = {
  electricity_facility: "Facility electricity",
  heating_diesel: "Heating diesel",
  cooling_electricity: "Cooling electricity",
  interiorlights_electricity: "Lighting",
  interiorequipment_electricity: "Equipment",
  pumps_electricity: "Pumps",
  fans_electricity: "Fans",
};

const formatNumber = (value, digits = 1) =>
  typeof value === "number" ? value.toFixed(digits) : "n/a";

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
      value: `${formatNumber(value?.kwh, 2)} kWh`,
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

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [rooms, setRooms] = useState([]);
  const [roomConfigs, setRoomConfigs] = useState({});
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState(null);
  const [showPayload, setShowPayload] = useState(false);
  const [showResponseJson, setShowResponseJson] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.status))
      .catch(() => setBackendStatus("Backend unreachable"));
  }, []);

  useEffect(() => {
    const loadRooms = async () => {
      setRoomsLoading(true);
      setRoomsError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/rooms`);
        if (!res.ok) {
          throw new Error(`Failed to load rooms (${res.status})`);
        }

        const data = await res.json();
        setRooms(data);
        setRoomConfigs(buildInitialRoomConfigs(data));
      } catch (error) {
        setRoomsError(error.message);
      } finally {
        setRoomsLoading(false);
      }
    };

    loadRooms();
  }, []);

  const toggleRoom = (roomId) => {
    setRoomConfigs((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        enabled: !prev[roomId]?.enabled,
      },
    }));
  };

  const updateRoomValue = (roomId, field, value) => {
    setRoomConfigs((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: value,
      },
    }));
  };

  const selectedRooms = rooms
    .filter((room) => roomConfigs[room.id]?.enabled)
    .map((room) => {
      const config = roomConfigs[room.id];
      const payload = {
        room_id: room.id,
      };

      if (room.supports.occupancy) {
        payload.occupancy = config.occupancy;
      }

      if (room.supports.heating_setpoint) {
        payload.heating_setpoint = config.heating_setpoint;
      }

      if (room.supports.cooling_setpoint) {
        payload.cooling_setpoint = config.cooling_setpoint;
      }

      return payload;
    });

  const plannedPayload = {
    rooms: selectedRooms,
  };

  const selectedCount = selectedRooms.length;
  const heatingDieselChart = simulationResult
    ? buildRoomSeriesChart(
        simulationResult.room_runs || [],
        "heating_diesel_daily",
        "kwh"
      )
    : { data: [], series: [] };
  const facilityElectricityChart = simulationResult
    ? buildRoomSeriesChart(
        simulationResult.room_runs || [],
        "electricity_facility_daily",
        "kwh"
      )
    : { data: [], series: [] };
  const meanAirTemperatureChart = simulationResult
    ? buildRoomSeriesChart(
        simulationResult.room_runs || [],
        "zone_mean_air_temperature_daily",
        "avg_mean_air_temperature_c"
      )
    : { data: [], series: [] };

  const handleRunSimulation = async () => {
    setSimulationLoading(true);
    setSimulationError(null);
    setSimulationResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/simulate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(plannedPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Simulation request failed (${res.status})`);
      }

      setShowResponseJson(false);
      setSimulationResult(data);
    } catch (error) {
      setSimulationError(error.message);
    } finally {
      setSimulationLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl p-8">
      <div className="mb-4">
        <h1 className="mb-1">upat-nzc-energyplus</h1>
        <p className="text-muted-foreground">
          Backend status: <strong>{backendStatus}</strong>
        </p>
      </div>
      <Separator className="mb-6" />

      <Card className="mb-6 bg-gray-50 ring-0">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Room Simulations
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-3">
            <div>
              <div className="font-medium">Simulation scope</div>
              <div className="text-sm text-muted-foreground">
                Select the rooms to configure. Inputs are rendered from
                `GET /rooms`.
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Selected rooms: <strong>{selectedCount}</strong>
            </div>
          </div>

          {roomsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading room metadata...
            </div>
          )}

          {roomsError && (
            <Card className="text-destructive">
              <CardContent>{roomsError}</CardContent>
            </Card>
          )}

          {!roomsLoading && !roomsError && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rooms.map((room) => {
                const config = roomConfigs[room.id];
                const isEnabled = Boolean(config?.enabled);

                return (
                  <Card
                    key={room.id}
                    className={isEnabled ? "ring-2 ring-primary/30" : ""}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-3">
                        <span>{room.label}</span>
                        <label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => toggleRoom(room.id)}
                          />
                          Include
                        </label>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border px-2 py-1">
                          {room.thermostat_type === "dual_setpoint"
                            ? "Heating + Cooling"
                            : "Heating only"}
                        </span>
                        <span className="rounded-full border px-2 py-1">
                          Zone: {room.zone_name}
                        </span>
                      </div>

                      <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Static schedules
                        </div>
                        <div className="grid gap-1 text-xs">
                          {Object.entries(room.static_schedules || {})
                            .filter(([, value]) => Boolean(value))
                            .map(([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center justify-between gap-3"
                              >
                                <span className="text-muted-foreground">
                                  {scheduleLabels[key] || key}
                                </span>
                                <code className="rounded bg-background px-1.5 py-0.5 text-[11px]">
                                  {value}
                                </code>
                              </div>
                            ))}
                        </div>
                      </div>

                      {room.supports.occupancy && (
                        <InputNumber
                          label="Occupancy"
                          value={config?.occupancy}
                          onChange={(value) =>
                            updateRoomValue(room.id, "occupancy", value)
                          }
                          minValue={0}
                          step={1}
                          isDisabled={!isEnabled}
                        />
                      )}

                      {room.supports.heating_setpoint && (
                        <InputNumber
                          label="Heating setpoint"
                          suffix="°C"
                          value={config?.heating_setpoint}
                          onChange={(value) =>
                            updateRoomValue(room.id, "heating_setpoint", value)
                          }
                          step={1}
                          isDisabled={!isEnabled}
                        />
                      )}

                      {room.supports.cooling_setpoint && (
                        <InputNumber
                          label="Cooling setpoint"
                          suffix="°C"
                          value={config?.cooling_setpoint}
                          onChange={(value) =>
                            updateRoomValue(room.id, "cooling_setpoint", value)
                          }
                          step={1}
                          isDisabled={!isEnabled}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleRunSimulation}
              disabled={
                roomsLoading ||
                !!roomsError ||
                selectedCount === 0 ||
                simulationLoading
              }
              size="lg"
            >
              {simulationLoading ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Running simulations...
                </>
              ) : (
                "Run simulations"
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              This submits the new room-based payload to `/simulate`.
            </p>
          </div>

          {simulationError && (
            <Card className="text-destructive">
              <CardContent>{simulationError}</CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Planned Payload</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPayload((prev) => !prev)}
            >
              {showPayload ? "Hide" : "Show"}
            </Button>
          </CardTitle>
        </CardHeader>
        {showPayload && (
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(plannedPayload, null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>

      {simulationResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Simulation Response</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResponseJson((prev) => !prev)}
              >
                {showResponseJson ? "Hide JSON" : "Show JSON"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="font-semibold">{simulationResult.status}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Requested</div>
                <div className="font-semibold">
                  {simulationResult.summary?.requested_rooms ?? 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Successful</div>
                <div className="font-semibold">
                  {simulationResult.summary?.successful_rooms ?? 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Failed</div>
                <div className="font-semibold">
                  {simulationResult.summary?.failed_rooms ?? 0}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {simulationResult.room_runs?.map((roomRun) => (
                <Card key={roomRun.room_id} size="sm">
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
                        <span className="rounded-full border px-2 py-1 text-muted-foreground">
                          code {roomRun.execution?.returncode ?? "n/a"}
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
                        The backend accepted the room payload, but the
                        EnergyPlus process failed during execution.
                      </p>
                    )}
                    {roomRun.execution?.success && (() => {
                      const summary = getRoomSummaryRows(roomRun);
                      return (
                        <div className="grid gap-2 text-sm">
                          {summary.period && (
                            <div className="rounded-md bg-muted/50 px-2 py-1">
                              <span className="text-muted-foreground">Period: </span>
                              <strong>{summary.period}</strong>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md bg-muted/50 px-2 py-1">
                              <div className="text-xs text-muted-foreground">
                                Avg temp
                              </div>
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
                                  <span className="text-muted-foreground">
                                    {row.label}
                                  </span>
                                  <strong>{row.value}</strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              ))}
            </div>

            {showResponseJson && (
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(simulationResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {simulationResult &&
        (heatingDieselChart.data.length > 0 ||
          facilityElectricityChart.data.length > 0 ||
          meanAirTemperatureChart.data.length > 0) && (
          <div className="mt-6 grid gap-6">
            {heatingDieselChart.data.length > 0 && (
              <MultiSeriesLineChart
                title="Daily Heating Diesel by Room"
                data={heatingDieselChart.data}
                series={heatingDieselChart.series}
                unit="kWh"
                decimals={2}
              />
            )}
            {facilityElectricityChart.data.length > 0 && (
              <MultiSeriesLineChart
                title="Daily Facility Electricity by Room"
                data={facilityElectricityChart.data}
                series={facilityElectricityChart.series}
                unit="kWh"
                decimals={2}
              />
            )}
            {meanAirTemperatureChart.data.length > 0 && (
              <MultiSeriesLineChart
                title="Daily Mean Air Temperature by Room"
                data={meanAirTemperatureChart.data}
                series={meanAirTemperatureChart.series}
                unit="°C"
                decimals={2}
              />
            )}
          </div>
        )}
    </div>
  );
}

export default App;
