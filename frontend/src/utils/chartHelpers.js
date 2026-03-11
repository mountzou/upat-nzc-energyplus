export const zoneLabelMap = {
  CLASSROOM_LEFT: "Classroom Left",
  CLASSROOM_RIGHT: "Classroom Right",
  HALLWAY_ROOM3: "Hallway Room 3",
  ROOM2_SMALL: "Room 2 Small",
};

export const getZoneLabel = (zoneName) => zoneLabelMap[zoneName] || zoneName;

export const formatDateLabel = (dateStr) => {
  if (!dateStr) return "N/A";

  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const formatShortDate = (dateStr) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

export const pivotByZone = (data, valueField) =>
  Object.values(
    data.reduce((acc, row) => {
      if (!acc[row.date]) acc[row.date] = { date: row.date };
      acc[row.date][row.zone_name] = row[valueField];
      return acc;
    }, {})
  );

export const slugifySeriesKey = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "series";

export const buildRoomSeriesChart = (
  roomRuns,
  dailyKey,
  valueField,
  roomLabelField = "room_label"
) => {
  const rowsByDate = {};
  const series = [];

  roomRuns
    .filter((roomRun) => roomRun?.execution?.success)
    .forEach((roomRun) => {
      const points = roomRun.results?.daily_timeseries?.[dailyKey] || [];

      if (!points.length) {
        return;
      }

      const roomLabel = roomRun[roomLabelField] || roomRun.room_id;
      const seriesKey = slugifySeriesKey(roomLabel);

      series.push({
        key: seriesKey,
        label: roomLabel,
      });

      points.forEach((point) => {
        if (!rowsByDate[point.date]) {
          rowsByDate[point.date] = { date: point.date };
        }
        rowsByDate[point.date][seriesKey] = point[valueField];
      });
    });

  return {
    data: Object.values(rowsByDate).sort((a, b) => a.date.localeCompare(b.date)),
    series,
  };
};
