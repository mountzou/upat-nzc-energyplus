import RoomResultCard from "@/components/simulation/RoomResultCard";
import SchoolSummaryCard from "@/components/simulation/SchoolSummaryCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SimulationResponse({ simulationResult }) {
  if (!simulationResult) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span>Simulation Response</span>
            <span
              className={
                simulationResult.status === "success"
                  ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                  : simulationResult.status === "partial_success"
                    ? "rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
                    : "rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"
              }
            >
              {simulationResult.status}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <SchoolSummaryCard simulationResult={simulationResult} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {simulationResult.room_runs?.map((roomRun) => (
            <RoomResultCard key={roomRun.room_id} roomRun={roomRun} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
