import { Button } from "@/components/ui/button";
import { LogOutIcon } from "lucide-react";

export default function AppHeader({
  backendStatus,
  schoolLabel,
  onLogout,
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h1>upat-nzc-energyplus</h1>
          <span
            className={
              backendStatus === "ok"
                ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700"
                : "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            }
          >
            Backend {backendStatus}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
          {schoolLabel}
        </div>
        <Button variant="outline" onClick={onLogout}>
          <LogOutIcon className="mr-2 size-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
