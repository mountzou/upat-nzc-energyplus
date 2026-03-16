import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppHeader({
  backendStatus,
  schoolLabel,
  currentPath,
  onLogout,
  onNavigate,
}) {
  const overviewSelected = currentPath === "/overview";

  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h1>School Digital Twin</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            className={cn(
              "text-xs transition-colors duration-200 ease-out",
              overviewSelected ? "text-muted-foreground" : "font-medium text-foreground"
            )}
            onClick={() => onNavigate("/")}
            type="button"
          >
            Simulations
          </button>
          <Switch
            aria-label="Toggle between simulations and overview"
            checked={overviewSelected}
            onCheckedChange={(checked) => onNavigate(checked ? "/overview" : "/")}
          />
          <button
            className={cn(
              "text-xs transition-colors duration-200 ease-out",
              overviewSelected ? "font-medium text-foreground" : "text-muted-foreground"
            )}
            onClick={() => onNavigate("/overview")}
            type="button"
          >
            Overview
          </button>
        </div>
        <div className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
          {schoolLabel}
        </div>
        <div className="h-6 w-px shrink-0 bg-border" aria-hidden />
        <Button variant="outline" onClick={onLogout}>
          <LogOutIcon className="mr-2 size-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
