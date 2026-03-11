import { Separator } from "@/components/ui/separator";

export default function AppFooter() {
  return (
    <footer className="mt-auto">
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-3 px-8 py-4 text-xs text-muted-foreground">
        <div>Digital Twin - SchoolHeroZ Project</div>
        <div>Designed and developed by Applied Electronics Lab, Dept. of Electrical & Computer Engineering, University of Patras</div>
      </div>
    </footer>
  );
}
