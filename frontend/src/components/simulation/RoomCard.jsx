import RoomSchedulesDrawer from "@/components/simulation/RoomSchedulesDrawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputNumber } from "@/components/ui/input-number";
import { DoorOpenIcon } from "lucide-react";

export default function RoomCard({
  room,
  config,
  isEnabled,
  onToggle,
  onUpdateValue,
}) {
  return (
    <Card className={isEnabled ? "ring-2 ring-primary/30" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <DoorOpenIcon className="size-4 text-muted-foreground" />
            {room.label}
          </span>
          <label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <input type="checkbox" checked={isEnabled} onChange={onToggle} />
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

        <RoomSchedulesDrawer
          roomLabel={room.label}
          staticSchedules={room.static_schedules}
        />

        {room.supports.occupancy && (
          <InputNumber
            label="Occupancy"
            value={config?.occupancy}
            onChange={(value) => onUpdateValue("occupancy", value)}
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
            onChange={(value) => onUpdateValue("heating_setpoint", value)}
            step={1}
            isDisabled={!isEnabled}
          />
        )}

        {room.supports.cooling_setpoint && (
          <InputNumber
            label="Cooling setpoint"
            suffix="°C"
            value={config?.cooling_setpoint}
            onChange={(value) => onUpdateValue("cooling_setpoint", value)}
            step={1}
            isDisabled={!isEnabled}
          />
        )}
      </CardContent>
    </Card>
  );
}
