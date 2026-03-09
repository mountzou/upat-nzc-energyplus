import { useEffect, useState } from "react";

import ZoneLineChart from "./components/ZoneLineChart";
import SingleLineChart from "./components/SingleLineChart";
import {
  getZoneLabel,
  formatDateLabel,
  pivotByZone,
} from "./utils/chartHelpers";
import "./App.css";

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

  const handleSetpointChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleOccupancyChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      zone_occupancy: {
        ...prev.zone_occupancy,
        [name]: Number(value),
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
    ["electricity_facility", "Facility Electricity"],
    ["heating_diesel", "Heating Diesel"],
    ["cooling_electricity", "Cooling Electricity"],
    ["interiorlights_electricity", "Interior Lights"],
    ["interiorequipment_electricity", "Interior Equipment"],
    ["pumps_electricity", "Pumps"],
    ["fans_electricity", "Fans"],
  ].filter(([key]) => energySummary[key]);

  return (
    <div className="app-layout">
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ marginBottom: "0.35rem" }}>upat-nzc-energyplus</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Backend status: <strong>{backendStatus}</strong>
        </p>
      </div>

      <div className="card card-form">
        <h2 style={{ marginTop: 0 }}>Simulation Inputs</h2>

        <div className="setpoint-grid">
          <label>
            Heating setpoint
            <input
              type="number"
              name="heating_setpoint"
              value={formData.heating_setpoint}
              onChange={handleSetpointChange}
              className="input-field"
            />
          </label>

          <label>
            Cooling setpoint
            <input
              type="number"
              name="cooling_setpoint"
              value={formData.cooling_setpoint}
              onChange={handleSetpointChange}
              className="input-field"
            />
          </label>
        </div>

        <h3 style={{ marginBottom: "0.75rem" }}>Zone Occupancy</h3>

        <div className="occupancy-grid">
          <label>
            Classroom Left
            <input
              type="number"
              name="Classroom_Left"
              value={formData.zone_occupancy.Classroom_Left}
              onChange={handleOccupancyChange}
              className="input-field"
            />
          </label>

          <label>
            Classroom Right
            <input
              type="number"
              name="Classroom_Right"
              value={formData.zone_occupancy.Classroom_Right}
              onChange={handleOccupancyChange}
              className="input-field"
            />
          </label>

          <label>
            Room 2 Small
            <input
              type="number"
              name="Room2_Small"
              value={formData.zone_occupancy.Room2_Small}
              onChange={handleOccupancyChange}
              className="input-field"
            />
          </label>

          <label>
            Hallway Room 3
            <input
              type="number"
              name="Hallway_Room3"
              value={formData.zone_occupancy.Hallway_Room3}
              onChange={handleOccupancyChange}
              className="input-field"
            />
          </label>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Running..." : "Run simulation"}
        </button>
      </div>

      {simulationResult?.error && (
        <div className="card" style={{ color: "#b91c1c", marginBottom: "1rem" }}>
          {simulationResult.error}
        </div>
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
            <div className="card">
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Status</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {simulationResult.status}
              </div>
            </div>

            <div className="card">
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Engine</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {simulationResult.simulation_engine}
              </div>
            </div>

            <div className="card">
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Run ID</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, wordBreak: "break-word" }}>
                {simulationResult.run_id}
              </div>
            </div>

            <div className="card">
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Execution</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {simulationResult.execution?.success ? "Successful" : "Failed"}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Simulation Period</h2>
            <div>
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Date Range</div>
              <div style={{ fontWeight: 700 }}>
                {formatDateLabel(periodInfo?.start_date)} – {formatDateLabel(periodInfo?.end_date)}
              </div>
            </div>

            {periodInfo ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Environment Name</div>
                  <div style={{ fontWeight: 700 }}>
                    {getEnvironmentNameLabel(periodInfo.environment_period_name)}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Environment Index</div>
                  <div style={{ fontWeight: 700 }}>{periodInfo.environment_period_index}</div>
                </div>

                <div>
                  <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Environment Type</div>
                  <div style={{ fontWeight: 700 }}>
                    {getEnvironmentTypeLabel(periodInfo.environment_type)}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Warmup Excluded</div>
                  <div style={{ fontWeight: 700 }}>
                    {periodInfo.warmup_excluded ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ marginBottom: 0 }}>No period information available.</p>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Energy Summary</h2>
            <div className="energy-grid">
              {energyCards.map(([key, label]) => (
                <div key={key} className="energy-card">
                  <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>{label}</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                    {energySummary[key].kwh.toFixed(2)} kWh
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Zone Temperature Summary</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="table-cell">Zone</th>
                  <th className="table-cell">Avg (°C)</th>
                  <th className="table-cell">Min (°C)</th>
                  <th className="table-cell">Max (°C)</th>
                </tr>
              </thead>
              <tbody>
                {zoneTemps.map((zone) => (
                  <tr key={zone.zone_name}>
                    <td className="table-cell">{getZoneLabel(zone.zone_name)}</td>
                    <td className="table-cell">{zone.avg_mean_air_temperature_c.toFixed(2)}</td>
                    <td className="table-cell">{zone.min_mean_air_temperature_c.toFixed(2)}</td>
                    <td className="table-cell">{zone.max_mean_air_temperature_c.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Zone Occupancy Summary</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="table-cell">Zone</th>
                  <th className="table-cell">Avg</th>
                  <th className="table-cell">Min</th>
                  <th className="table-cell">Max</th>
                </tr>
              </thead>
              <tbody>
                {zoneOccupancy.map((zone) => (
                  <tr key={zone.zone_name}>
                    <td className="table-cell">{getZoneLabel(zone.zone_name)}</td>
                    <td className="table-cell">{zone.avg_occupant_count.toFixed(2)}</td>
                    <td className="table-cell">{zone.min_occupant_count.toFixed(2)}</td>
                    <td className="table-cell">{zone.max_occupant_count.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SingleLineChart title="Daily Heating Diesel" data={dailyHeatingDiesel} />
          <SingleLineChart title="Daily Facility Electricity" data={dailyElectricityFacility} />

          <ZoneLineChart title="Daily Zone Mean Air Temperature" data={zoneTemperatureChartData} unit="°C" />
          <ZoneLineChart title="Daily Zone CO₂ Concentration" data={zoneCo2ChartData} unit="ppm" decimals={0} />
          <ZoneLineChart title="Daily Zone Occupancy" data={zoneOccupancyChartData} unit="people" />
          <ZoneLineChart title="Daily Zone Relative Humidity" data={zoneRelativeHumidityChartData} unit="%" decimals={1} />
          <ZoneLineChart title="Daily Zone Operative Temperature" data={zoneOperativeTemperatureChartData} unit="°C" />
          <ZoneLineChart title="Daily Zone Heating Setpoint" data={zoneHeatingSetpointChartData} unit="°C" />
          <ZoneLineChart title="Daily Zone Cooling Setpoint" data={zoneCoolingSetpointChartData} unit="°C" />
        </div>
      )}
    </div>
  );
}

export default App;