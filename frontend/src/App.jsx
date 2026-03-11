import { useEffect, useState } from "react";

import MultiSeriesLineChart from "@/components/MultiSeriesLineChart";
import authData from "@/data/auth.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { InputNumber } from "@/components/ui/input-number";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { buildRoomSeriesChart } from "@/utils/chartHelpers";
import { DoorOpenIcon, LogOutIcon, PlayIcon } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const SESSION_AUTH_KEY = "upat_auth";
const SESSION_SCHOOL_KEY = "upat_school_id";

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

const getStoredAuthState = () => {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, schoolId: "", username: "" };
  }

  const isAuthenticated = window.sessionStorage.getItem(SESSION_AUTH_KEY) === "true";
  const schoolId = window.sessionStorage.getItem(SESSION_SCHOOL_KEY) || "";
  const username = schoolId || "";

  return { isAuthenticated, schoolId, username };
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
  const storedAuth = getStoredAuthState();
  const [isAuthenticated, setIsAuthenticated] = useState(storedAuth.isAuthenticated);
  const [authSchoolId, setAuthSchoolId] = useState(storedAuth.schoolId);
  const [loginUsername, setLoginUsername] = useState(storedAuth.username);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(storedAuth.schoolId);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomConfigs, setRoomConfigs] = useState({});
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState(null);
  const [showResponseJson, setShowResponseJson] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.status))
      .catch(() => setBackendStatus("Backend unreachable"));
  }, []);

  useEffect(() => {
    document.title = isAuthenticated
      ? "Simulations — SchoolHeroZ Digital Twin"
      : "Login — SchoolHeroZ Digital Twin";
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSchools([]);
      setSelectedSchoolId("");
      setSchoolsLoading(false);
      return;
    }

    const loadSchools = async () => {
      setSchoolsLoading(true);
      setSchoolsError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/schools`);
        if (!res.ok) {
          throw new Error(`Failed to load schools (${res.status})`);
        }

        const data = await res.json();
        setSchools(data);
        setSelectedSchoolId(authSchoolId || data[0]?.id || "");
      } catch (error) {
        setSchoolsError(error.message);
      } finally {
        setSchoolsLoading(false);
      }
    };

    loadSchools();
  }, [authSchoolId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRooms([]);
      setRoomConfigs({});
      setRoomsLoading(false);
      return;
    }

    if (!selectedSchoolId) {
      setRooms([]);
      setRoomConfigs({});
      setRoomsLoading(false);
      return;
    }

    const loadRooms = async () => {
      setRoomsLoading(true);
      setRoomsError(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/rooms?school_id=${selectedSchoolId}`
        );
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
  }, [isAuthenticated, selectedSchoolId]);

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
    school_id: selectedSchoolId,
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

  const handleLogin = (event) => {
    event.preventDefault();
    setLoginError(null);

    const matchedUser = authData.users.find(
      (user) =>
        user.username === loginUsername.trim() &&
        user.password === loginPassword &&
        user.username === `school_${user.school_id.split("_")[1]}`
    );

    if (!matchedUser) {
      setLoginError("Invalid username or password.");
      return;
    }

    window.sessionStorage.setItem(SESSION_AUTH_KEY, "true");
    window.sessionStorage.setItem(SESSION_SCHOOL_KEY, matchedUser.school_id);
    setIsAuthenticated(true);
    setAuthSchoolId(matchedUser.school_id);
    setSelectedSchoolId(matchedUser.school_id);
    setLoginPassword("");
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_AUTH_KEY);
    window.sessionStorage.removeItem(SESSION_SCHOOL_KEY);
    setIsAuthenticated(false);
    setAuthSchoolId("");
    setSelectedSchoolId("");
    setSchools([]);
    setRooms([]);
    setRoomConfigs({});
    setSimulationResult(null);
    setSimulationError(null);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError(null);
  };

  const lockedSchool = schools.find((school) => school.id === authSchoolId);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="mx-auto flex w-full max-w-md flex-1 items-center p-8">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Login</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <form className="grid gap-4" onSubmit={handleLogin}>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Username</span>
                  <input
                    className="h-10 rounded-md border border-input bg-background px-3"
                    type="text"
                    value={loginUsername}
                    onChange={(event) => setLoginUsername(event.target.value)}
                    placeholder="school_22"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Password</span>
                  <input
                    className="h-10 rounded-md border border-input bg-background px-3"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="1234"
                  />
                </label>
                <Button type="submit" size="lg">
                  Login
                </Button>
              </form>
              {loginError && <p className="text-sm text-destructive">{loginError}</p>}
              <p className="text-sm text-muted-foreground">
                Use `school_X` as username and `1234` as password.
              </p>
            </CardContent>
          </Card>
        </div>
        <footer className="mt-auto">
          <Separator />
          <div className="grid gap-1 px-8 py-4 text-center text-xs text-muted-foreground">
            <div>Digital Twin — SchoolHeroZ Project</div>
            <div>Designed and developed by University of Patras</div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 p-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <h1>upat-nzc-energyplus</h1>
              <span
                className={
                  backendStatus === "ok"
                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700"
                    : "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                }
              >
                Backend {backendStatus}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
              {lockedSchool?.label || authSchoolId}
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOutIcon className="mr-2 size-4" />
              Logout
            </Button>
          </div>
        </div>
        <Separator className="mb-6" />

        <Card className="mb-6 bg-gray-50 ring-0">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">School Simulations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-3">
              <div>
                <div className="font-medium">Simulation scope</div>
                <div className="text-sm text-muted-foreground">
                  Choose the rooms to configure.
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Selected rooms: <strong>{selectedCount}</strong>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-white px-4 py-3">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">School</span>
                <select
                  className="h-10 cursor-not-allowed rounded-md border border-border bg-muted/60 px-3 text-muted-foreground opacity-100"
                  value={selectedSchoolId}
                  onChange={() => {}}
                  disabled
                >
                  {selectedSchoolId && (
                    <option value={selectedSchoolId}>
                      {lockedSchool?.label || selectedSchoolId}
                    </option>
                  )}
                </select>
              </label>
            </div>
          </div>

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
                  <Card
                    key={room.id}
                    className={isEnabled ? "ring-2 ring-primary/30" : ""}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <DoorOpenIcon className="size-4 text-muted-foreground" />
                          {room.label}
                        </span>
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
                        {room.supports.heating_setpoint && (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                            Heating
                          </span>
                        )}
                        {room.supports.cooling_setpoint && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">
                            Cooling
                          </span>
                        )}
                        <span className="rounded-full border px-2 py-1">
                          Zone: {room.zone_name}
                        </span>
                      </div>

                      <Drawer>
                        <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Static schedules
                            </div>
                            <DrawerTrigger asChild>
                              <Button variant="outline" size="sm">
                                Show
                              </Button>
                            </DrawerTrigger>
                          </div>
                        </div>
                        <DrawerContent className="mx-auto w-full max-w-2xl">
                          <DrawerHeader>
                            <div>
                              <DrawerTitle>{room.label} schedules</DrawerTitle>
                              <DrawerDescription>
                                Built-in schedules used by this room model.
                              </DrawerDescription>
                            </div>
                            <DrawerClose />
                          </DrawerHeader>
                          <DrawerBody>
                            <div className="grid gap-2 text-sm">
                              {Object.entries(room.static_schedules || {})
                                .filter(([, value]) => Boolean(value))
                                .map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"
                                  >
                                    <span className="text-muted-foreground">
                                      {scheduleLabels[key] || key}
                                    </span>
                                    <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                                      {value}
                                    </code>
                                  </div>
                                ))}
                            </div>
                          </DrawerBody>
                        </DrawerContent>
                      </Drawer>

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

      <footer className="mt-auto">
        <Separator />
        <div className="grid gap-1 px-8 py-4 text-center text-xs text-muted-foreground">
          <div>Digital Twin — SchoolHeroZ Project</div>
          <div>Designed and developed by University of Patras</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
