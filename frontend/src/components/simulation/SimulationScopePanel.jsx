export default function SimulationScopePanel({
  selectedCount,
  selectedSchoolId,
  schoolLabel,
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-3">
        <div>
          <div className="font-medium">Simulation scope</div>
          <div className="text-sm text-muted-foreground">
            Choose the rooms to configure.
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Selected rooms: <strong>{selectedCount}</strong>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white px-4 py-3">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">School</span>
          <select
            className="h-10 cursor-not-allowed rounded-md border border-border bg-muted/60 px-3 text-muted-foreground opacity-100"
            value={selectedSchoolId}
            onChange={() => {}}
            disabled
          >
            {selectedSchoolId && (
              <option value={selectedSchoolId}>{schoolLabel || selectedSchoolId}</option>
            )}
          </select>
        </label>
      </div>
    </div>
  );
}
