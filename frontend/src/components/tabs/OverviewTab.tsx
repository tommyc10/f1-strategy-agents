import { StrategyMap } from "@/components/StrategyMap";
import { RaceTimeline } from "@/components/RaceTimeline";
import { ResultsTable } from "@/components/ResultsTable";
import type { RaceSummary, RaceEvent } from "@/lib/api";

type Props = {
  summary: RaceSummary;
  raceEvents: RaceEvent[];
  totalLaps: number;
};

export function OverviewTab({ summary, raceEvents, totalLaps }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <StrategyMap strategyMap={summary.strategy_map} />
      <RaceTimeline events={raceEvents} totalLaps={totalLaps} />
      <ResultsTable positions={summary.positions} />
    </div>
  );
}
