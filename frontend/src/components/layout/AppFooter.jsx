import { Separator } from "@/components/ui/separator";

export default function AppFooter() {
  return (
    <footer className="mt-auto">
      <Separator />
      <div className="grid gap-1 px-8 py-4 text-center text-xs text-muted-foreground">
        <div>Digital Twin - SchoolHeroZ Project</div>
        <div>Designed and developed by University of Patras</div>
      </div>
    </footer>
  );
}
