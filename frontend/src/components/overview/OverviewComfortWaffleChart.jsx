import React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * PMV thermal comfort waffle: 12 hours (06:00–17:00) × 5 weekdays (Mon–Fri).
 * grid[dayIndex][hourIndex] = { pmv?, comfort_state } from API.
 * comfortable = green, slight discomfort = yellow, discomfort = red, insufficient = grey.
 */
const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = 6 + i;
  return `${String(h).padStart(2, "0")}:00`;
});
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const ROWS = 5;
const COLS = 12;

const CELL_STYLES = {
  comfortable: {
    backgroundColor: "oklch(96.2% 0.044 156.743)",
    color: "oklch(52.7% 0.154 150.069)",
  },
  "slight discomfort": {
    backgroundColor: "oklch(95% 0.12 95)",
    color: "oklch(55% 0.15 85)",
  },
  discomfort: {
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
  if (cell && typeof cell === "object" && "comfort_state" in cell) return cell;
  return null;
}

function getCellComfortState(grid, dayIndex, hourIndex) {
  const cell = getCell(grid, dayIndex, hourIndex);
  const state = cell?.comfort_state;
  return state in CELL_STYLES ? state : "insufficient";
}

function getCellTooltipRows(cell) {
  if (!cell) return { rows: ["No data"] };
  const { pmv, comfort_state } = cell;
  if (comfort_state === "insufficient") return { rows: ["No data"] };
  const rows = [];
  if (pmv != null && typeof pmv === "number") {
    rows.push(`PMV: ${Number(pmv).toFixed(2)}`);
  }
  const label =
    comfort_state.charAt(0).toUpperCase() + comfort_state.slice(1).toLowerCase();
  rows.push(label);
  return { rows };
}

export default function OverviewComfortWaffleChart({ grid = null }) {
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
          <div className="min-w-[7rem]" aria-hidden />
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex items-center justify-center py-1 text-xs text-muted-foreground"
            >
              {hour}
            </div>
          ))}
          {DAYS.map((day, dayIndex) => (
            <React.Fragment key={day}>
              <div className="flex min-w-[7rem] items-center pr-2 text-xs text-muted-foreground">
                {day}
              </div>
              {Array.from({ length: COLS }, (_, hourIndex) => {
                const cell = getCell(grid, dayIndex, hourIndex);
                const state = getCellComfortState(grid, dayIndex, hourIndex);
                const style = CELL_STYLES[state];
                const { rows: tooltipRows } = getCellTooltipRows(cell);
                return (
                  <Tooltip key={`${day}-${hourIndex}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="aspect-square min-h-6 min-w-6 cursor-default rounded-sm"
                        style={style}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[16rem]">
                      <div className="space-y-2">
                        <p className="font-medium">
                          {day} {HOURS[hourIndex]}
                        </p>
                        <div className="space-y-1 text-muted-foreground">
                          {tooltipRows.map((row, i) => (
                            <p key={i} className="flex items-center gap-2">
                              <span
                                className="h-2 w-1.5 shrink-0 rounded-sm bg-black"
                                aria-hidden
                              />
                              {row}
                            </p>
                          ))}
                        </div>
                      </div>
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
