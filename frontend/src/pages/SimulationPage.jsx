import { useMemo, useState } from "react";

import AppFooter from "@/components/layout/AppFooter";
import AppHeader from "@/components/layout/AppHeader";
import RoomCard from "@/components/simulation/RoomCard";
import SimulationCharts from "@/components/simulation/SimulationCharts";
import SimulationResponse from "@/components/simulation/SimulationResponse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import useSchoolRooms from "@/hooks/useSchoolRooms";
import { API_BASE_URL } from "@/lib/api";
import { formatSchoolLabel } from "@/lib/schools";
import { buildRoomSeriesChart } from "@/utils/chartHelpers";
import { PlayIcon } from "lucide-react";

const DIESEL_GJ_PER_LITER = 0.0386;
const GJ_TO_KWH = 277.7777777778;
const DIESEL_KWH_PER_LITER = DIESEL_GJ_PER_LITER * GJ_TO_KWH;

const convertChartDataKwhToDieselLiters = (chart) => ({
  ...chart,
  data: chart.data.map((row) => {
    const nextRow = { ...row };

    chart.series.forEach((item) => {
      const value = row[item.key];
      if (typeof value === "number" && Number.isFinite(value)) {
        nextRow[item.key] = value / DIESEL_KWH_PER_LITER;
      }
    });

    return nextRow;
  }),
});

export default function SimulationPage({
  backendStatus,
  authSchoolId,
  currentPath,
  onLogout,
  onNavigate,
}) {
  const {
    schools,
    selectedSchoolId,
    schoolsLoading,
    schoolsError,
    rooms,
    roomConfigs,
    roomsLoading,
    roomsError,
    setSelectedSchoolId,
    toggleRoom,
    updateRoomValue,
    resetSchoolRooms,
  } = useSchoolRooms({
    isAuthenticated: true,
    authSchoolId,
  });
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState(null);

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
    school_id: selectedSchoolId,
    rooms: selectedRooms,
  };

  const selectedCount = selectedRooms.length;

  const heatingDieselChart = useMemo(
    () =>
      simulationResult
        ? convertChartDataKwhToDieselLiters(
            buildRoomSeriesChart(
              simulationResult.room_runs || [],
              "heating_diesel_daily",
              "kwh"
            )
          )
        : { data: [], series: [] },
    [simulationResult]
  );

  const facilityElectricityChart = useMemo(
    () =>
      simulationResult
        ? buildRoomSeriesChart(
            simulationResult.room_runs || [],
            "electricity_facility_daily",
            "kwh"
          )
        : { data: [], series: [] },
    [simulationResult]
  );

  const meanAirTemperatureChart = useMemo(
    () =>
      simulationResult
        ? buildRoomSeriesChart(
            simulationResult.room_runs || [],
            "zone_mean_air_temperature_daily",
            "avg_mean_air_temperature_c"
          )
        : { data: [], series: [] },
    [simulationResult]
  );

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

      setSimulationResult(data);
    } catch (error) {
      setSimulationError(error.message);
    } finally {
      setSimulationLoading(false);
    }
  };

  const handleLogoutClick = () => {
    onLogout();
    resetSchoolRooms();
    setSimulationResult(null);
    setSimulationError(null);
    setSelectedSchoolId("");
  };

  const lockedSchool = schools.find((school) => school.id === authSchoolId);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 p-8">
        <AppHeader
          backendStatus={backendStatus}
          schoolLabel={lockedSchool?.label || formatSchoolLabel(authSchoolId)}
          currentPath={currentPath}
          onLogout={handleLogoutClick}
          onNavigate={onNavigate}
        />
        <Separator className="mb-6" />

        <Card className="mb-6 bg-gray-50 ring-0">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">School Simulations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            {schoolsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Loading school list...
              </div>
            )}

            {schoolsError && (
              <Card className="text-destructive">
                <CardContent>{schoolsError}</CardContent>
              </Card>
            )}

            {roomsLoading && !schoolsError && (
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
                    <RoomCard
                      key={room.id}
                      room={room}
                      config={config}
                      isEnabled={isEnabled}
                      onToggle={() => toggleRoom(room.id)}
                      onUpdateValue={(field, value) =>
                        updateRoomValue(room.id, field, value)
                      }
                    />
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleRunSimulation}
                disabled={
                  schoolsLoading ||
                  !!schoolsError ||
                  roomsLoading ||
                  !!roomsError ||
                  !selectedSchoolId ||
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
                  <>
                    <PlayIcon className="mr-2 size-4" />
                    Run simulations
                  </>
                )}
              </Button>
            </div>

            {simulationError && (
              <Card className="text-destructive">
                <CardContent>{simulationError}</CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <SimulationResponse simulationResult={simulationResult} />

        <SimulationCharts
          heatingDieselChart={heatingDieselChart}
          facilityElectricityChart={facilityElectricityChart}
          meanAirTemperatureChart={meanAirTemperatureChart}
        />
      </div>

      <AppFooter />
    </div>
  );
}
