import { useEffect, useState } from "react";

import AppFooter from "@/components/layout/AppFooter";
import OverviewComfortWaffleChart from "@/components/overview/OverviewComfortWaffleChart";
import OverviewWaffleChart from "@/components/overview/OverviewWaffleChart";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_BASE_URL } from "@/lib/api";
import {
  Bubbles,
  DoorOpen,
  Droplets,
  Info,
  Minus,
  SprayCan,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
} from "lucide-react";
import useOverviewHistory from "@/hooks/useOverviewHistory";
import useOverviewLatest from "@/hooks/useOverviewLatest";
import useSchoolDevices from "@/hooks/useSchoolDevices";

const METRIC_CONFIG = [
  { key: "temperature", label: "Temperature", fallbackUnit: "C", color: "var(--chart-1)" },
  {
    key: "relative_humidity",
    label: "Relative Humidity",
    fallbackUnit: "%",
    color: "var(--chart-2)",
  },
  { key: "co2", label: "CO2", fallbackUnit: "ppm", color: "var(--chart-3)" },
  { key: "voc", label: "VOC", fallbackUnit: null, color: "var(--chart-4)" },
  { key: "pm25", label: "PM2.5", fallbackUnit: "ug/m3", color: "var(--chart-5)" },
];
const PERIODS = [
  { id: "1h", label: "1 hour", description: "Last 1 hour" },
  { id: "8h", label: "8 hours", description: "Last 8 hours" },
  { id: "24h", label: "24 hours", description: "Last 24 hours" },
  { id: "7d", label: "7 days", description: "Last 7 days" },
  { id: "30d", label: "30 days", description: "Last 30 days" },
];

const IAQ_THRESHOLDS = {
  co2: { "1h": 750, "8h": 850, "24h": 750, "7d": 650, "30d": 650 },
  pm25: { "1h": 10, "8h": 12, "24h": 15, "7d": 8, "30d": 8 },
};

const METRIC_ICONS = {
  temperature: Thermometer,
  relative_humidity: Droplets,
  co2: Wind,
  voc: SprayCan,
  pm25: Bubbles,
};

/** Percentage change below this is shown as neutral (no up/down) to avoid flickering. */
const TREND_NEUTRAL_THRESHOLD_PCT = 1;

/**
 * Compare latest reading to period average. Returns { value, direction } or null if unavailable.
 * value = ((latest - periodAvg) / periodAvg) * 100; direction: 1 = up, -1 = down, 0 = neutral (within threshold).
 */
function getTrendForMetric(periodAvg, latestValue) {
  if (typeof periodAvg !== "number" || typeof latestValue !== "number") return null;
  if (periodAvg === 0) return null;
  const pct = ((latestValue - periodAvg) / periodAvg) * 100;
  const absPct = Math.abs(pct);
  const direction = absPct < TREND_NEUTRAL_THRESHOLD_PCT ? 0 : pct > 0 ? 1 : -1;
  return {
    value: Math.round(pct * 10) / 10,
    direction,
  };
}

function getIAQCategory(metricKey, periodId, value) {
  if (metricKey !== "co2" && metricKey !== "pm25") return null;
  const thresholds = IAQ_THRESHOLDS[metricKey];
  if (!thresholds || !(periodId in thresholds)) return null;
  if (typeof value !== "number") return null;
  const threshold = thresholds[periodId];
  return value <= threshold ? "Good" : "Elevated";
}

function getIAQTooltip(metricKey, periodId, category) {
  if (metricKey !== "co2" && metricKey !== "pm25") return null;
  const thresholds = IAQ_THRESHOLDS[metricKey];
  if (!thresholds || !(periodId in thresholds)) return null;
  const threshold = thresholds[periodId];
  const unit = metricKey === "co2" ? "ppm" : "µg/m³";
  const periodLabel = PERIODS.find((p) => p.id === periodId)?.label ?? periodId;
  if (category === "Good") {
    return `Mean value for ${periodLabel} is below the guideline (≤ ${threshold} ${unit})`;
  }
  return `Mean value for ${periodLabel} is above the guideline (> ${threshold} ${unit})`;
}

// 1h thresholds for waffle (same as IAQ_THRESHOLDS 1h)
const WAFFLE_CO2_1H = 750;
const WAFFLE_PM25_1H = 10;

/**
 * Build 5×12 IAQ grid from 30-day hourly history. Each cell = { status, meanCo2, meanPm25 }.
 * status = "good" | "elevated" | "insufficient"; meanCo2/meanPm25 in ppm and µg/m³ or null.
 */
function buildIAQGrid(items) {
  const DAY_INDEX_MAX = 5;
  const HOUR_INDEX_MAX = 12;
  const cellKey = (dayIndex, hourIndex) => `${dayIndex}-${hourIndex}`;
  const sums = {};
  for (let d = 0; d < DAY_INDEX_MAX; d++) {
    for (let h = 0; h < HOUR_INDEX_MAX; h++) {
      sums[cellKey(d, h)] = { co2Sum: 0, co2N: 0, pm25Sum: 0, pm25N: 0 };
    }
  }
  for (const item of items || []) {
    const t = item.event_time ? new Date(item.event_time) : null;
    if (!t || isNaN(t.getTime())) continue;
    const day = t.getDay();
    const hour = t.getHours();
    if (day < 1 || day > 5 || hour < 6 || hour > 17) continue;
    const dayIndex = day - 1;
    const hourIndex = hour - 6;
    const co2 = item.measurements?.co2?.value;
    const pm25 = item.measurements?.pm25?.value;
    const key = cellKey(dayIndex, hourIndex);
    if (typeof co2 === "number") {
      sums[key].co2Sum += co2;
      sums[key].co2N += 1;
    }
    if (typeof pm25 === "number") {
      sums[key].pm25Sum += pm25;
      sums[key].pm25N += 1;
    }
  }
  const grid = [];
  for (let d = 0; d < DAY_INDEX_MAX; d++) {
    const row = [];
    for (let h = 0; h < HOUR_INDEX_MAX; h++) {
      const key = cellKey(d, h);
      const { co2Sum, co2N, pm25Sum, pm25N } = sums[key];
      const meanCo2 = co2N > 0 ? co2Sum / co2N : null;
      const meanPm25 = pm25N > 0 ? pm25Sum / pm25N : null;
      const co2Ok = meanCo2 != null && meanCo2 <= WAFFLE_CO2_1H;
      const pm25Ok = meanPm25 != null && meanPm25 <= WAFFLE_PM25_1H;
      let status;
      if (meanCo2 == null && meanPm25 == null) {
        status = "insufficient";
      } else if (meanCo2 != null && meanPm25 != null && co2Ok && pm25Ok) {
        status = "good";
      } else {
        status = "elevated";
      }
      row.push({ status, meanCo2, meanPm25 });
    }
    grid.push(row);
  }
  return grid;
}

export default function OverviewPage({
  authSchoolId,
  backendStatus,
  schoolLabel,
  currentPath,
  onLogout,
  onNavigate,
}) {
  const {
    devices,
    loading: devicesLoading,
    error: devicesError,
  } = useSchoolDevices(authSchoolId);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [waffleDeviceId, setWaffleDeviceId] = useState("");
  const [comfortWaffleDeviceId, setComfortWaffleDeviceId] = useState("");
  const [period, setPeriod] = useState("24h");
  const [comfortGrid, setComfortGrid] = useState(null);
  const [comfortGridLoading, setComfortGridLoading] = useState(false);
  const [comfortGridError, setComfortGridError] = useState(null);
  const {
    data: history1hData,
    loading: history1hLoading,
    error: history1hError,
  } = useOverviewHistory(selectedDeviceId, {
    aggregate: "avg",
    bucketUnit: "hour",
    bucketSize: 1,
    limit: 1,
  });
  const {
    data: history8hData,
    loading: history8hLoading,
    error: history8hError,
  } = useOverviewHistory(selectedDeviceId, {
    aggregate: "avg",
    bucketUnit: "hour",
    bucketSize: 1,
    limit: 8,
  });
  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
  } = useOverviewHistory(selectedDeviceId, {
    aggregate: "avg",
    bucketUnit: "hour",
    bucketSize: 1,
    limit: 24,
  });
  const {
    data: weeklyHistoryData,
    loading: weeklyHistoryLoading,
    error: weeklyHistoryError,
  } = useOverviewHistory(selectedDeviceId, {
    aggregate: "avg",
    bucketUnit: "day",
    bucketSize: 1,
    limit: 7,
  });
  const {
    data: monthlyHistoryData,
    loading: monthlyHistoryLoading,
    error: monthlyHistoryError,
  } = useOverviewHistory(selectedDeviceId, {
    aggregate: "avg",
    bucketUnit: "day",
    bucketSize: 1,
    limit: 30,
  });
  const {
    data: waffleHistoryData,
    loading: waffleHistoryLoading,
    error: waffleHistoryError,
  } = useOverviewHistory(waffleDeviceId, {
    aggregate: "avg",
    bucketUnit: "hour",
    bucketSize: 1,
    limit: 720,
  });
  const { data: latestData } = useOverviewLatest(selectedDeviceId);
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId);

  const history1hItems = history1hData?.items || [];
  const history8hItems = history8hData?.items || [];
  const historyItems = historyData?.items || [];
  const weeklyHistoryItems = weeklyHistoryData?.items || [];
  const monthlyHistoryItems = monthlyHistoryData?.items || [];
  const waffleHistoryItems = waffleHistoryData?.items || [];
  const iaqGrid = waffleDeviceId && waffleHistoryItems.length > 0 ? buildIAQGrid(waffleHistoryItems) : null;

  const computeAverages = (items) =>
    METRIC_CONFIG.map((metric) => {
      const values = items
        .map((item) => item.measurements?.[metric.key]?.value)
        .filter((v) => typeof v === "number");
      const mean =
        values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
      const unit =
        items.find((item) => item.measurements?.[metric.key])?.measurements?.[metric.key]
          ?.unit ?? metric.fallbackUnit;
      return { key: metric.key, label: metric.label, value: mean, unit };
    });

  const averages1h = computeAverages(history1hItems);
  const averages8h = computeAverages(history8hItems);
  const averages24h = computeAverages(historyItems);
  const averagesWeekly = computeAverages(weeklyHistoryItems);
  const averagesMonthly = computeAverages(monthlyHistoryItems);

  const periodData = {
    "1h": {
      averages: averages1h,
      loading: history1hLoading,
      error: history1hError,
      description: "Mean values over the last 1 hour",
    },
    "8h": {
      averages: averages8h,
      loading: history8hLoading,
      error: history8hError,
      description: "Mean values over the last 8 hours",
    },
    "24h": {
      averages: averages24h,
      loading: historyLoading,
      error: historyError,
      description: "Mean values over the last 24 hours",
    },
    "7d": {
      averages: averagesWeekly,
      loading: weeklyHistoryLoading,
      error: weeklyHistoryError,
      description: "Mean values over the last 7 days",
    },
    "30d": {
      averages: averagesMonthly,
      loading: monthlyHistoryLoading,
      error: monthlyHistoryError,
      description: "Mean values over the last 30 days",
    },
  };
  const currentPeriod = periodData[period];
  const currentAverages = currentPeriod?.averages ?? [];
  const periodLoading = currentPeriod?.loading ?? false;
  const periodError = currentPeriod?.error ?? null;

  const tempMetric = currentAverages.find((m) => m.key === "temperature");
  const rhMetric = currentAverages.find((m) => m.key === "relative_humidity");
  const tdb = typeof tempMetric?.value === "number" ? tempMetric.value : null;
  const rh = typeof rhMetric?.value === "number" ? rhMetric.value : null;

  const [discomfortIndex, setDiscomfortIndex] = useState(null);
  const [discomfortLoading, setDiscomfortLoading] = useState(false);
  const [discomfortError, setDiscomfortError] = useState(null);
  const [heatIndex, setHeatIndex] = useState(null);
  const [heatIndexLoading, setHeatIndexLoading] = useState(false);
  const [heatIndexError, setHeatIndexError] = useState(null);
  const [pmvPpd, setPmvPpd] = useState(null);
  const [pmvPpdLoading, setPmvPpdLoading] = useState(false);
  const [pmvPpdError, setPmvPpdError] = useState(null);

  useEffect(() => {
    if (tdb == null || rh == null) {
      setDiscomfortIndex(null);
      setDiscomfortError(null);
      return;
    }
    let cancelled = false;
    setDiscomfortLoading(true);
    setDiscomfortError(null);
    const params = new URLSearchParams({ tdb: String(tdb), rh: String(rh) });
    fetch(`${API_BASE_URL}/thermal-comfort/discomfort-index?${params.toString()}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok && data?.di != null && data?.discomfort_condition != null) {
          setDiscomfortIndex({ di: data.di, discomfort_condition: data.discomfort_condition });
          setDiscomfortError(null);
        } else {
          setDiscomfortIndex(null);
          if (!ok) setDiscomfortError(data?.detail || "Failed to load discomfort index");
        }
      })
      .catch((err) => {
        if (!cancelled) setDiscomfortError(err.message || "Failed to load discomfort index");
      })
      .finally(() => {
        if (!cancelled) setDiscomfortLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tdb, rh]);

  useEffect(() => {
    if (tdb == null || rh == null) {
      setHeatIndex(null);
      setHeatIndexError(null);
      return;
    }
    let cancelled = false;
    setHeatIndexLoading(true);
    setHeatIndexError(null);
    const params = new URLSearchParams({ tdb: String(tdb), rh: String(rh) });
    fetch(`${API_BASE_URL}/thermal-comfort/heat-index?${params.toString()}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok && data?.hi != null) {
          setHeatIndex(data.hi);
          setHeatIndexError(null);
        } else {
          setHeatIndex(null);
          if (!ok) setHeatIndexError(data?.detail || "Failed to load heat index");
        }
      })
      .catch((err) => {
        if (!cancelled) setHeatIndexError(err.message || "Failed to load heat index");
      })
      .finally(() => {
        if (!cancelled) setHeatIndexLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tdb, rh]);

  useEffect(() => {
    if (tdb == null || rh == null) {
      setPmvPpd(null);
      setPmvPpdError(null);
      return;
    }
    let cancelled = false;
    setPmvPpdLoading(true);
    setPmvPpdError(null);
    const params = new URLSearchParams({ tdb: String(tdb), rh: String(rh) });
    fetch(`${API_BASE_URL}/thermal-comfort/pmv-ppd?${params.toString()}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok && data?.pmv != null && data?.ppd != null) {
          setPmvPpd({
            pmv: data.pmv,
            ppd: data.ppd,
            compliance: data.compliance,
            comfort_state: data.comfort_state,
          });
          setPmvPpdError(null);
        } else {
          setPmvPpd(null);
          if (!ok) setPmvPpdError(data?.detail || "Failed to load PMV/PPD");
        }
      })
      .catch((err) => {
        if (!cancelled) setPmvPpdError(err.message || "Failed to load PMV/PPD");
      })
      .finally(() => {
        if (!cancelled) setPmvPpdLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tdb, rh]);

  useEffect(() => {
    if (!devices.length) {
      setSelectedDeviceId("");
      setWaffleDeviceId("");
      setComfortWaffleDeviceId("");
      return;
    }

    const hasSelectedDevice = devices.some((device) => device.id === selectedDeviceId);
    if (!hasSelectedDevice) {
      setSelectedDeviceId(devices[0].id);
    }
    const hasWaffleDevice = devices.some((device) => device.id === waffleDeviceId);
    if (!hasWaffleDevice) {
      setWaffleDeviceId(devices[0].id);
    }
    const hasComfortWaffleDevice = devices.some((device) => device.id === comfortWaffleDeviceId);
    if (!hasComfortWaffleDevice) {
      setComfortWaffleDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId, waffleDeviceId, comfortWaffleDeviceId]);

  useEffect(() => {
    const deviceId = (comfortWaffleDeviceId || "").trim();
    if (!deviceId) {
      setComfortGrid(null);
      setComfortGridError(null);
      setComfortGridLoading(false);
      return;
    }
    let cancelled = false;
    setComfortGridLoading(true);
    setComfortGridError(null);
    fetch(`${API_BASE_URL}/overview/devices/${encodeURIComponent(deviceId)}/comfort-grid`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setComfortGrid(null);
          setComfortGridError(data?.detail || `Request failed (${res.status})`);
          return;
        }
        if (data?.grid) {
          setComfortGrid(data);
          setComfortGridError(null);
        } else {
          setComfortGrid(null);
          setComfortGridError(data?.detail || "Invalid comfort grid response");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setComfortGrid(null);
          setComfortGridError(err.message || "Failed to load comfort grid");
        }
      })
      .finally(() => {
        if (!cancelled) setComfortGridLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [comfortWaffleDeviceId]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 p-8">
        <AppHeader
          backendStatus={backendStatus}
          schoolLabel={schoolLabel}
          currentPath={currentPath}
          onLogout={onLogout}
          onNavigate={onNavigate}
        />
        <Separator className="mb-6" />

        <Card className="mb-6 bg-gray-50 ring-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="border-l-4 border-l-black pl-3 text-xl font-semibold">Environmental Overview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track metrics and recent trends in indoor environmental conditions.
              </p>
            </div>
            {!devicesLoading && !devicesError && devices.length > 0 && (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4 md:flex-row md:justify-end md:gap-6">
                <div className="grid min-w-0 gap-2 text-sm md:min-w-[10rem]">
                  <span className="font-medium">Room</span>
                  <Select
                    value={selectedDeviceId}
                    onValueChange={(value) => setSelectedDeviceId(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          <span className="flex items-center gap-2">
                            <DoorOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                            {device.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedDevice && (
                  <div className="grid min-w-0 gap-2 text-sm md:min-w-0">
                    <span className="font-medium">Averaging period</span>
                    <div
                      className="flex justify-center rounded-lg border border-input bg-background p-1"
                      role="group"
                      aria-label="Select averaging period"
                    >
                      {PERIODS.map((p) => (
                        <Button
                          key={p.id}
                          variant={period === p.id ? "secondary" : "ghost"}
                          size="sm"
                          className={
                            period === p.id
                              ? "rounded-md bg-black text-white hover:bg-black"
                              : "rounded-md"
                          }
                          onClick={() => setPeriod(p.id)}
                          aria-pressed={period === p.id}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            {devicesError && (
              <Card className="border-destructive text-destructive">
                <CardContent>{devicesError}</CardContent>
              </Card>
            )}

            {devicesLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Loading school devices...
              </div>
            )}

            {!devicesLoading && !devicesError && devices.length === 0 && (
              <Card>
                <CardContent>No devices are configured for this school yet.</CardContent>
              </Card>
            )}

            {selectedDevice && (
              <TooltipProvider delayDuration={300}>
              <div className="mt-6 grid gap-4">
                {periodError && selectedDeviceId && (
                  <Card className="border-destructive text-destructive">
                    <CardContent className="pt-4">
                      {PERIODS.find((p) => p.id === period)?.label} averages: {periodError}
                    </CardContent>
                  </Card>
                )}

                {(periodLoading || !periodError) && selectedDeviceId && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      {periodLoading
                        ? METRIC_CONFIG.map((metric) => (
                            <Card key={metric.key}>
                              <CardHeader className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Skeleton className="h-4 w-24" />
                                  <Skeleton className="h-7 w-7 rounded-lg" />
                                </div>
                                <Skeleton className="h-9 w-20" />
                                <Skeleton className="h-4 w-32" />
                              </CardHeader>
                            </Card>
                          ))
                        : currentAverages.map((metric) => {
                        const iaqCategory = getIAQCategory(metric.key, period, metric.value);
                        const Icon = METRIC_ICONS[metric.key] ?? null;
                        const latestVal = latestData?.readings?.[metric.key]?.value;
                        const trend =
                          getTrendForMetric(metric.value, latestVal) ?? { value: 0, direction: 0 };
                        const trendUp = trend.direction === 1;
                        const trendDown = trend.direction === -1;
                        const trendNeutral = trend.direction === 0;
                        const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus;
                        const trendColor = trendUp
                          ? "text-green-600"
                          : trendDown
                            ? "text-red-600"
                            : "text-yellow-600";
                        return (
                          <Card key={metric.key}>
                            <CardHeader className="gap-2">
                              <CardDescription className="flex items-center justify-between text-foreground">
                                <span>{metric.label}</span>
                                {Icon && (
                                  <span
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
                                    style={{
                                      backgroundColor: "oklch(87.2% 0.007 219.6)",
                                      color: "oklch(37.8% 0.015 216)",
                                    }}
                                    aria-hidden="true"
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                  </span>
                                )}
                              </CardDescription>
                              <CardTitle className="flex items-baseline justify-between gap-2 text-3xl">
                                <span>
                                  {metric.value != null ? Number(metric.value).toFixed(1) : "N/A"}
                                  {metric.unit ? (
                                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                                      {metric.unit}
                                    </span>
                                  ) : null}
                                </span>
                                <span
                                  className={`ml-auto shrink-0 inline-flex items-center gap-0.5 text-sm font-normal ${trendColor}`}
                                  aria-label={
                                    trendUp
                                      ? `Trend up ${trend.value}%`
                                      : trendDown
                                        ? `Trend down ${trend.value}%`
                                        : "No change"
                                  }
                                >
                                  <TrendIcon className="h-4 w-4 shrink-0" />
                                  <span className="tabular-nums">{trend.value}%</span>
                                </span>
                              </CardTitle>
                              {iaqCategory && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex h-6 w-full cursor-help items-center justify-center rounded-full text-xs font-medium"
                                      style={{
                                        backgroundColor:
                                          iaqCategory === "Good"
                                            ? "oklch(96.2% 0.044 156.743)"
                                            : "oklch(93.6% 0.032 17.717)",
                                        color:
                                          iaqCategory === "Good"
                                            ? "oklch(52.7% 0.154 150.069)"
                                            : "oklch(57.7% 0.245 27.325)",
                                      }}
                                      role="status"
                                      aria-label={`Indoor air quality: ${iaqCategory}`}
                                    >
                                      {iaqCategory === "Good" ? "Good" : "Elevated"}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>{getIAQTooltip(metric.key, period, iaqCategory)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </CardHeader>
                          </Card>
                        );
                      })}
                    </div>

                    {periodLoading ? (
                      <div className="mt-6 grid grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <Skeleton className="h-9 w-16" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-6 grid grid-cols-4 gap-x-8 gap-y-4">
                        <div className="grid grid-cols-2 items-start gap-x-2 border-r border-border pr-6 text-left">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-2xl font-bold tabular-nums text-foreground">
                              {discomfortLoading
                                ? "…"
                                : discomfortError
                                  ? "—"
                                  : discomfortIndex != null
                                    ? `${Number(discomfortIndex.di).toFixed(1)} °C`
                                    : "—"}
                            </span>
                            <span className="text-sm text-muted-foreground">Discomfort index</span>
                          </div>
                          <p className="min-w-0 text-xs text-muted-foreground">Combines air temperature and humidity to show how uncomfortable the environment is.</p>
                        </div>
                        <div className="grid grid-cols-2 items-start gap-x-2 border-r border-border pr-6 text-left">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-2xl font-bold tabular-nums text-foreground">
                              {heatIndexLoading
                                ? "…"
                                : heatIndexError
                                  ? "—"
                                  : heatIndex != null
                                    ? `${Number(heatIndex).toFixed(1)} °C`
                                    : "—"}
                            </span>
                            <span className="text-sm text-muted-foreground">Heat index</span>
                          </div>
                          <p className="min-w-0 text-xs text-muted-foreground">Shows how warm the air feels when humidity is taken into account.</p>
                        </div>
                        <div className="grid grid-cols-2 items-start gap-x-2 border-r border-border pr-6 text-left">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-2xl font-bold tabular-nums text-foreground">
                              {pmvPpdLoading
                                ? "…"
                                : pmvPpdError
                                  ? "—"
                                  : pmvPpd != null
                                    ? Number(pmvPpd.pmv).toFixed(1)
                                    : "—"}
                            </span>
                            <span className="text-sm text-muted-foreground">PMV</span>
                          </div>
                          <p className="min-w-0 text-xs text-muted-foreground">Rates thermal sensation on a scale from cold (-3) to hot (+3), with 0 meaning neutral comfort.</p>
                        </div>
                        <div className="grid grid-cols-2 items-start gap-x-2 text-left">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-2xl font-bold tabular-nums text-foreground">
                              {pmvPpdLoading
                                ? "…"
                                : pmvPpdError
                                  ? "—"
                                  : pmvPpd != null
                                    ? `${Number(pmvPpd.ppd).toFixed(1)}%`
                                    : "—"}
                            </span>
                            <span className="text-sm text-muted-foreground">PPD</span>
                          </div>
                          <p className="min-w-0 text-xs text-muted-foreground">Estimates the percentage of people likely to feel thermally uncomfortable in these conditions.</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 bg-gray-50 ring-0">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="border-l-4 border-l-black pl-3 text-xl font-semibold">Overview of IAQ conditions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track the mean IAQ conditions per day and time.
              </p>
            </div>
            {!devicesLoading && !devicesError && devices.length > 0 && (
              <div className="min-w-0 max-w-[14rem]">
                <Select value={waffleDeviceId} onValueChange={setWaffleDeviceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        <span className="flex items-center gap-2">
                          <DoorOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          {device.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {waffleHistoryError && waffleDeviceId && (
              <p className="mb-4 text-sm text-destructive">{waffleHistoryError}</p>
            )}
            {waffleHistoryLoading && waffleDeviceId ? (
              <div
                className="grid w-full gap-px"
                style={{
                  gridTemplateColumns: "auto repeat(12, minmax(0, 1fr))",
                  gridTemplateRows: "auto repeat(5, auto)",
                }}
              >
                <div className="min-w-[7rem]" aria-hidden />
                {Array.from({ length: 12 }, (_, i) => (
                  <Skeleton key={i} className="h-5 w-full rounded" />
                ))}
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                  <div key={day} className="contents">
                    <Skeleton className="min-w-[7rem] max-w-[7rem] rounded py-1" />
                    {Array.from({ length: 12 }, (_, i) => (
                      <Skeleton key={i} className="aspect-square min-h-6 min-w-6 rounded-sm" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <OverviewWaffleChart grid={iaqGrid} />
            )}
            {waffleDeviceId && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Average IAQ conditions during the last 30 days in {devices.find((d) => d.id === waffleDeviceId)?.label ?? waffleDeviceId}.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 bg-gray-50 ring-0">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="border-l-4 border-l-black pl-3 text-xl font-semibold">Overview of thermal comfort</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track the mean thermal experience per day and time.
              </p>
            </div>
            {!devicesLoading && !devicesError && devices.length > 0 && (
              <div className="min-w-0 max-w-[14rem]">
                <Select value={comfortWaffleDeviceId} onValueChange={setComfortWaffleDeviceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        <span className="flex items-center gap-2">
                          <DoorOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          {device.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {comfortGridError && comfortWaffleDeviceId && (
              <p className="mb-4 text-sm text-destructive">{comfortGridError}</p>
            )}
            {comfortGridLoading && comfortWaffleDeviceId ? (
              <div
                className="grid w-full gap-px"
                style={{
                  gridTemplateColumns: "auto repeat(12, minmax(0, 1fr))",
                  gridTemplateRows: "auto repeat(5, auto)",
                }}
              >
                <div className="min-w-[7rem]" aria-hidden />
                {Array.from({ length: 12 }, (_, i) => (
                  <Skeleton key={i} className="h-5 w-full rounded" />
                ))}
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                  <div key={day} className="contents">
                    <Skeleton className="min-w-[7rem] max-w-[7rem] rounded py-1" />
                    {Array.from({ length: 12 }, (_, i) => (
                      <Skeleton key={i} className="aspect-square min-h-6 min-w-6 rounded-sm" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <OverviewComfortWaffleChart grid={comfortGrid?.grid ?? null} />
            )}
            {comfortWaffleDeviceId && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Average PMV during the last 30 days in {devices.find((d) => d.id === comfortWaffleDeviceId)?.label ?? comfortWaffleDeviceId}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <AppFooter />
    </div>
  );
}
