import { LapPaceChart } from "@/components/LapPaceChart";
import { DriverComparison } from "@/components/DriverComparison";
import { Skeleton } from "@/components/ui/skeleton";
import type { RaceSummary } from "@/lib/api";

type Props = {
  summary: RaceSummary;
};

export function PaceTab({ summary }: Props) {
  if (!summary.laps || summary.laps.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] rounded-2xl" />
        <Skeleton className="h-[240px] rounded-2xl" />
      </div>
    );
  }

  const drivers = summary.positions.map((p) => p.driver);

  return (
    <div className="flex flex-col gap-4">
      <LapPaceChart laps={summary.laps} drivers={drivers.slice(0, 10)} />
      <DriverComparison laps={summary.laps} positions={summary.positions} />
    </div>
  );
}
