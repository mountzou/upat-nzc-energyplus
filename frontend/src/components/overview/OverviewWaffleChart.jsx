import React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Waffle chart: 12 hours (06:00–17:00) × 5 weekdays (Mon–Fri).
 * grid[dayIndex][hourIndex] = { status, meanCo2?, meanPm25? } (1‑month average IAQ).
 */
const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = 6 + i;
  return `${String(h).padStart(2, "0")}:00`;
});
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const ROWS = 5;
const COLS = 12;

const CELL_STYLES = {
  good: {
    backgroundColor: "oklch(96.2% 0.044 156.743)",
    color: "oklch(52.7% 0.154 150.069)",
  },
  elevated: {
    backgroundColor: "oklch(93.6% 0.032 17.717)",
    color: "oklch(57.7% 0.245 27.325)",
  },
  insufficient: {
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
  },
};

function getCell(grid, dayIndex, hourIndex) {
  if (!grid || !grid[dayIndex]) return null;
  const cell = grid[dayIndex][hourIndex];
  if (cell && typeof cell === "object" && "status" in cell) return cell;
  return null;
}

function getCellStatus(grid, dayIndex, hourIndex) {
  const cell = getCell(grid, dayIndex, hourIndex);
  return cell?.status === "good" || cell?.status === "elevated" ? cell.status : "insufficient";
}

function formatCellTooltipValues(cell) {
  if (!cell) return "Insufficient data";
  const { meanCo2, meanPm25 } = cell;
  const parts = [];
  if (meanCo2 != null && typeof meanCo2 === "number") {
    parts.push(`CO2: ${Number(meanCo2).toFixed(1)} ppm`);
  }
  if (meanPm25 != null && typeof meanPm25 === "number") {
    parts.push(`PM2.5: ${Number(meanPm25).toFixed(1)} µg/m³`);
  }
  return parts.length > 0 ? parts.join(", ") : "Insufficient data";
}

export default function OverviewWaffleChart({ grid = null }) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full">
        <div
        className="grid w-full gap-px"
        style={{
          gridTemplateColumns: "auto repeat(12, minmax(0, 1fr))",
          gridTemplateRows: `repeat(${ROWS + 1}, auto)`,
        }}
      >
        {/* Top-left corner: empty for alignment with day column */}
        <div className="min-w-[7rem]" aria-hidden />
        {/* X-axis: hour labels */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="flex items-center justify-center py-1 text-xs text-muted-foreground"
          >
            {hour}
          </div>
        ))}
        {/* Rows: day label + 12 waffle cells */}
        {DAYS.map((day, dayIndex) => (
          <React.Fragment key={day}>
            <div className="flex min-w-[7rem] items-center pr-2 text-xs text-muted-foreground">
              {day}
            </div>
            {Array.from({ length: COLS }, (_, hourIndex) => {
              const cell = getCell(grid, dayIndex, hourIndex);
              const status = getCellStatus(grid, dayIndex, hourIndex);
              const style = CELL_STYLES[status];
              const tooltipValues = formatCellTooltipValues(cell);
              return (
                <Tooltip key={`${day}-${hourIndex}`}>
                  <TooltipTrigger asChild>
                    <div
                      className="aspect-square min-h-6 min-w-6 cursor-default rounded-sm"
                      style={style}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[16rem]">
                    <p className="font-medium">
                      {day} {HOURS[hourIndex]}
                    </p>
                    <p className="text-muted-foreground">{tooltipValues}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
