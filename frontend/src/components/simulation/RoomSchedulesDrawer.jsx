import { Button } from "@/components/ui/button";
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

export default function RoomSchedulesDrawer({
  roomLabel,
  staticSchedules,
}) {
  return (
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
            <DrawerTitle>{roomLabel} schedules</DrawerTitle>
            <DrawerDescription>
              Built-in schedules used by this room model.
            </DrawerDescription>
          </div>
          <DrawerClose />
        </DrawerHeader>
        <DrawerBody>
          <div className="grid gap-2 text-sm">
            {Object.entries(staticSchedules || {})
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
  );
}
