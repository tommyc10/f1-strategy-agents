import { SectorBreakdown } from "@/components/SectorBreakdown";
import type { RaceSummary } from "@/lib/api";

type Props = {
  summary: RaceSummary;
};

export function SectorsTab({ summary }: Props) {
  const drivers = summary.positions.map((p) => p.driver);

  if (!summary.sectors || summary.sectors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">No sector data available</p>
      </div>
    );
  }

  return <SectorBreakdown sectors={summary.sectors} drivers={drivers.slice(0, 10)} />;
}
