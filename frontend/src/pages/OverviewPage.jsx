import { useEffect, useState } from "react";

import AppFooter from "@/components/layout/AppFooter";
import OverviewMetricHistoryChart from "@/components/overview/OverviewMetricHistoryChart";
import AppHeader from "@/components/layout/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
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
const TOP_ROW_METRICS = ["temperature", "relative_humidity"];
const SECOND_ROW_METRICS = ["voc", "pm25"];

const formatTimestamp = (value) => {
  if (!value) {
    return "No timestamp available";
  }

  return new Date(value).toLocaleString();
};

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
  const {
    data,
    loading,
    error,
  } = useOverviewLatest(selectedDeviceId);
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
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId);

  const historyItems = historyData?.items || [];
  const metricCharts = METRIC_CONFIG.map((metric) => ({
    ...metric,
    unit:
      historyItems.find((item) => item.measurements?.[metric.key])?.measurements?.[metric.key]?.unit ??
      metric.fallbackUnit,
    data: [...historyItems]
      .map((item) => ({
        event_time: item.event_time,
        value: item.measurements?.[metric.key]?.value,
      }))
      .filter((point) => typeof point.value === "number")
      .sort((pointA, pointB) => pointA.event_time.localeCompare(pointB.event_time)),
  }));
  const topRowCharts = metricCharts.filter((chart) => TOP_ROW_METRICS.includes(chart.key));
  const secondRowCharts = metricCharts.filter((chart) => SECOND_ROW_METRICS.includes(chart.key));
  const remainingCharts = metricCharts.filter(
    (chart) =>
      !TOP_ROW_METRICS.includes(chart.key) && !SECOND_ROW_METRICS.includes(chart.key)
  );

  useEffect(() => {
    if (!devices.length) {
      setSelectedDeviceId("");
      return;
    }

    const hasSelectedDevice = devices.some((device) => device.id === selectedDeviceId);
    if (!hasSelectedDevice) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

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
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Environmental Overview</CardTitle>
            <CardDescription>
              Inspect the latest environmental and air quality readings for the devices assigned to this school.
            </CardDescription>
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

            {!devicesLoading && !devicesError && devices.length > 0 && (
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Device</span>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3"
                  value={selectedDeviceId}
                  onChange={(event) => setSelectedDeviceId(event.target.value)}
                >
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.label} ({device.id})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {error && (
              <Card className="border-destructive text-destructive">
                <CardContent>{error}</CardContent>
              </Card>
            )}

            {loading && selectedDeviceId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Loading latest device readings...
              </div>
            )}

            {!devicesLoading && !devicesError && devices.length === 0 && (
              <Card>
                <CardContent>No devices are configured for this school yet.</CardContent>
              </Card>
            )}

            {!loading && !error && data && selectedDevice && (
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Latest Snapshot</CardTitle>
                    <CardDescription>
                      {selectedDevice.label} (`{data.device_id}`) updated {formatTimestamp(data.latest_event_time)}.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {METRIC_CONFIG.map((metric) => (
                    <Card key={metric.key}>
                      <CardHeader>
                        <CardDescription>{metric.label}</CardDescription>
                        <CardTitle className="text-3xl">
                          {data.readings?.[metric.key]?.value ?? "N/A"}
                          {data.readings?.[metric.key]?.unit ? (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                              {data.readings[metric.key].unit}
                            </span>
                          ) : null}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-50 ring-0">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Hourly Averages</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {historyError && (
              <Card className="border-destructive text-destructive">
                <CardContent>{historyError}</CardContent>
              </Card>
            )}

            {historyLoading && selectedDeviceId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Loading hourly history...
              </div>
            )}

            {!historyLoading && !historyError && selectedDevice && (
              <>
                <div className="text-sm text-muted-foreground">
                  Showing {historyData?.count ?? historyItems.length} hourly average buckets for {selectedDevice.label} (`{selectedDeviceId}`).
                </div>

                <div className="grid gap-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {topRowCharts.map((chart) => (
                      <OverviewMetricHistoryChart
                        key={chart.key}
                        title={chart.label}
                        data={chart.data}
                        unit={chart.unit}
                        color={chart.color}
                      />
                    ))}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {secondRowCharts.map((chart) => (
                      <OverviewMetricHistoryChart
                        key={chart.key}
                        title={chart.label}
                        data={chart.data}
                        unit={chart.unit}
                        color={chart.color}
                      />
                    ))}
                  </div>

                  {remainingCharts.map((chart) => (
                    <OverviewMetricHistoryChart
                      key={chart.key}
                      title={chart.label}
                      data={chart.data}
                      unit={chart.unit}
                      color={chart.color}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AppFooter />
    </div>
  );
}
