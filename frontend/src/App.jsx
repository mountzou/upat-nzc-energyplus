import { useEffect, useState } from "react";

import ZoneLineChart from "./components/ZoneLineChart";
import SingleLineChart from "./components/SingleLineChart";
import { Button } from "@/components/ui/button";
import { InputNumber } from "@/components/ui/input-number";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  getZoneLabel,
  formatDateLabel,
  pivotByZone,
} from "./utils/chartHelpers";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const getEnvironmentTypeLabel = (environmentType) => {
  if (environmentType === 1) return "Design Day";
  if (environmentType === 3) return "Run Period";
  return String(environmentType);
};

const getEnvironmentNameLabel = (environmentName) => {
  if (environmentName === "RUNPERIOD1") return "Main Run Period";
  return environmentName;
};

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    heating_setpoint: 21,
    cooling_setpoint: 25,
    zone_occupancy: {
      Classroom_Left: 20,
      Classroom_Right: 20,
      Room2_Small: 1,
      Hallway_Room3: 1,
    },
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.status))
      .catch(() => setBackendStatus("Backend unreachable"));
  }, []);

  const handleSetpointChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOccupancyChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      zone_occupancy: {
        ...prev.zone_occupancy,
        [name]: value,
      },
    }));
  };

  const runSimulation = async () => {
    setLoading(true);
    setSimulationResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/simulate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      setSimulationResult(data);
    } catch {
      setSimulationResult({ error: "Simulation request failed" });
    } finally {
      setLoading(false);
    }
  };

  const results = simulationResult?.results;
  const periodInfo = results?.period_info || null;
  const energySummary = results?.energy_summary || {};
  const zoneTemps = results?.zone_temperature_summary || [];
  const zoneOccupancy = results?.zone_occupancy_summary || [];

  const dailyHeatingDiesel = results?.daily_timeseries?.heating_diesel_daily || [];
  const dailyElectricityFacility = results?.daily_timeseries?.electricity_facility_daily || [];
  const dailyZoneMeanAirTemperature = results?.daily_timeseries?.zone_mean_air_temperature_daily || [];
  const dailyZoneCo2 = results?.daily_timeseries?.zone_co2_daily || [];
  const dailyZoneOccupancy = results?.daily_timeseries?.zone_occupancy_daily || [];
  const dailyZoneRelativeHumidity = results?.daily_timeseries?.zone_relative_humidity_daily || [];
  const dailyZoneOperativeTemperature = results?.daily_timeseries?.zone_operative_temperature_daily || [];
  const dailyZoneHeatingSetpoint = results?.daily_timeseries?.zone_heating_setpoint_daily || [];
  const dailyZoneCoolingSetpoint = results?.daily_timeseries?.zone_cooling_setpoint_daily || [];

  const zoneTemperatureChartData = pivotByZone(dailyZoneMeanAirTemperature, "avg_mean_air_temperature_c");
  const zoneCo2ChartData = pivotByZone(dailyZoneCo2, "avg_co2_ppm");
  const zoneOccupancyChartData = pivotByZone(dailyZoneOccupancy, "avg_occupant_count");
  const zoneRelativeHumidityChartData = pivotByZone(dailyZoneRelativeHumidity, "avg_relative_humidity_pct");
  const zoneOperativeTemperatureChartData = pivotByZone(dailyZoneOperativeTemperature, "avg_operative_temperature_c");
  const zoneHeatingSetpointChartData = pivotByZone(dailyZoneHeatingSetpoint, "avg_heating_setpoint_c");
  const zoneCoolingSetpointChartData = pivotByZone(dailyZoneCoolingSetpoint, "avg_cooling_setpoint_c");

  const energyCards = [
    ["electricity_facility", "Facility Electricity", "kWh"],
    ["heating_diesel", "Heating Diesel", "L"],
    ["cooling_electricity", "Cooling Electricity", "kWh"],
    ["interiorlights_electricity", "Interior Lights", "kWh"],
    ["interiorequipment_electricity", "Interior Equipment", "kWh"],
    ["pumps_electricity", "Pumps", "kWh"],
    ["fans_electricity", "Fans", "kWh"],
  ].filter(([key]) => energySummary[key]);

  return (
    <div className="mx-auto min-h-screen p-8">
      <div className="mb-4">
        <h1 className="mb-1">upat-nzc-energyplus</h1>
        <p className="text-muted-foreground">
          Backend status: <strong>{backendStatus}</strong>
        </p>
      </div>
      <Separator className="mb-6" />

      <Card className="mb-6 bg-gray-100 ring-0 [&_input]:bg-white">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Simulation Inputs</CardTitle>
        </CardHeader>
        <CardContent>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <InputNumber
            label="Heating setpoint"
            suffix="°C"
            value={formData.heating_setpoint}
            onChange={(v) => handleSetpointChange("heating_setpoint", v)}
            step={1}
          />
          <InputNumber
            label="Cooling setpoint"
            suffix="°C"
            value={formData.cooling_setpoint}
            onChange={(v) => handleSetpointChange("cooling_setpoint", v)}
            step={1}
          />
        </div>

        <h3 className="text-xl font-semibold mb-3">Zone Occupancy</h3>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <InputNumber
            label="Classroom Left"
            value={formData.zone_occupancy.Classroom_Left}
            onChange={(v) => handleOccupancyChange("Classroom_Left", v)}
            minValue={1}
            maxValue={25}
            step={1}
          />
          <InputNumber
            label="Classroom Right"
            value={formData.zone_occupancy.Classroom_Right}
            onChange={(v) => handleOccupancyChange("Classroom_Right", v)}
            minValue={1}
            maxValue={25}
            step={1}
          />
          <InputNumber
            label="Room 2 Small"
            value={formData.zone_occupancy.Room2_Small}
            onChange={(v) => handleOccupancyChange("Room2_Small", v)}
            minValue={1}
            maxValue={25}
            step={1}
          />
          <InputNumber
            label="Hallway Room 3"
            value={formData.zone_occupancy.Hallway_Room3}
            onChange={(v) => handleOccupancyChange("Hallway_Room3", v)}
            minValue={1}
            maxValue={25}
            step={1}
          />
        </div>

        <Button
          onClick={runSimulation}
          disabled={loading}
          size="lg"
        >
          {loading ? <><Spinner className="mr-2" /> Running...</> : "Run simulation"}
        </Button>

        </CardContent>
      </Card>

      {simulationResult?.error && (
        <Card className="mb-4 text-destructive">
          <CardContent>{simulationResult.error}</CardContent>
        </Card>
      )}

      {simulationResult && !simulationResult.error && (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-lg font-bold">{simulationResult.status}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Engine</div>
                <div className="text-lg font-bold">{simulationResult.simulation_engine}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Run ID</div>
                <div className="text-base font-bold break-all">{simulationResult.run_id}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Execution</div>
                <div className="text-lg font-bold">
                  {simulationResult.execution?.success ? "Successful" : "Failed"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Simulation Period</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Date Range</div>
                <div className="font-bold">
                  {formatDateLabel(periodInfo?.start_date)} – {formatDateLabel(periodInfo?.end_date)}
                </div>
              </div>

              {periodInfo ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Environment Name</div>
                    <div className="font-bold">
                      {getEnvironmentNameLabel(periodInfo.environment_period_name)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground">Environment Index</div>
                    <div className="font-bold">{periodInfo.environment_period_index}</div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground">Environment Type</div>
                    <div className="font-bold">
                      {getEnvironmentTypeLabel(periodInfo.environment_type)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground">Warmup Excluded</div>
                    <div className="font-bold">
                      {periodInfo.warmup_excluded ? "Yes" : "No"}
                    </div>
                  </div>
                </div>
              ) : (
                <p>No period information available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Energy Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                {energyCards.map(([key, label, unit]) => (
                  <Card key={key} size="sm">
                    <CardContent>
                      <div className="text-sm text-muted-foreground">{label}</div>
                      <div className="text-lg font-bold">
                        {energySummary[key].kwh.toFixed(2)} {unit}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zone Temperature Summary</CardTitle>
            </CardHeader>
            <CardContent>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="px-1.5 py-2.5 border-b border-border text-left">Zone</th>
                  <th className="px-1.5 py-2.5 border-b border-border text-left">Avg (°C)</th>
                  <th className="px-1.5 py-2.5 border-b border-border text-left">Min (°C)</th>
                  <th className="px-1.5 py-2.5 border-b border-border text-left">Max (°C)</th>
                </tr>
              </thead>
              <tbody>
                {zoneTemps.map((zone) => (
                  <tr key={zone.zone_name}>
                    <td className="px-1.5 py-2.5 border-b border-border text-left">{getZoneLabel(zone.zone_name)}</td>
                    <td className="px-1.5 py-2.5 border-b border-border text-left">{zone.avg_mean_air_temperature_c.toFixed(2)}</td>
                    <td className="px-1.5 py-2.5 border-b border-border text-left">{zone.min_mean_air_temperature_c.toFixed(2)}</td>
                    <td className="px-1.5 py-2.5 border-b border-border text-left">{zone.max_mean_air_temperature_c.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zone Occupancy Summary</CardTitle>
            </CardHeader>
            <CardContent>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="px-1.5 py-2.5 border-b border-border text-left">Zone</th>
                  <th className="px-1.5 py-2.5 border-b border-border text-left">Avg</th>
                  <th className="px-1.5 py-2.5 border-b border-border text-left">Min</th>
                  <th className="px-1.5 py-2.5 border-b border-border text-left">Max</th>
                </tr>
              </thead>
              <tbody>
                {zoneOccupancy.map((zone) => (
                  <tr key={zone.zone_name}>
                    <td className="px-1.5 py-2.5 border-b border-border text-left">{getZoneLabel(zone.zone_name)}</td>
                    <td className="px-1.5 py-2.5 border-b border-border text-left">{zone.avg_occupant_count.toFixed(2)}</td>
                    <td className="px-1.5 py-2.5 border-b border-border text-left">{zone.min_occupant_count.toFixed(2)}</td>
                    <td className="px-1.5 py-2.5 border-b border-border text-left">{zone.max_occupant_count.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </CardContent>
          </Card>

          <SingleLineChart title="Daily Heating Diesel" data={dailyHeatingDiesel} unit="L" />
          <SingleLineChart title="Daily Facility Electricity" data={dailyElectricityFacility} />

          <ZoneLineChart title="Daily Zone Mean Air Temperature" data={zoneTemperatureChartData} unit="°C" />
          <ZoneLineChart title="Daily Zone CO₂ Concentration" data={zoneCo2ChartData} unit="ppm" decimals={0} />
          {/* <ZoneLineChart title="Daily Zone Occupancy" data={zoneOccupancyChartData} unit="people" /> */}
          <ZoneLineChart title="Daily Zone Relative Humidity" data={zoneRelativeHumidityChartData} unit="%" decimals={1} />
          <ZoneLineChart title="Daily Zone Operative Temperature" data={zoneOperativeTemperatureChartData} unit="°C" />
          {/* <ZoneLineChart title="Daily Zone Heating Setpoint" data={zoneHeatingSetpointChartData} unit="°C" /> */}
          {/* <ZoneLineChart title="Daily Zone Cooling Setpoint" data={zoneCoolingSetpointChartData} unit="°C" /> */}
        </div>
      )}
    </div>
  );
}

export default App;