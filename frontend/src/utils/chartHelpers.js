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
