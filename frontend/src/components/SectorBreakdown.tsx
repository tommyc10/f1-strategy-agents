import { SectorTime } from "../lib/types";

type Props = {
  sectors: SectorTime[];
  drivers: string[];
};

export function SectorBreakdown({ sectors, drivers }: Props) {
  if (sectors.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl p-6">
        <h3 className="text-[10px] uppercase tracking-[2px] text-[var(--accent-muted)] font-semibold mb-4">
          Sector Analysis
        </h3>
        <p className="text-xs text-[var(--text-muted)]">No sector data available</p>
      </div>
    );
  }

  // Get the latest lap with sector data for each driver
  const latestSectorsByDriver = new Map<string, SectorTime[]>();
  const driverLaps = new Map<string, number>();

  for (const sector of sectors) {
    const currentLap = driverLaps.get(sector.driver) || 0;
    if (sector.lap_number >= currentLap) {
      driverLaps.set(sector.driver, sector.lap_number);
    }
  }

  for (const sector of sectors) {
    const driver = sector.driver;
    if (sector.lap_number === driverLaps.get(driver)) {
      if (!latestSectorsByDriver.has(driver)) {
        latestSectorsByDriver.set(driver, []);
      }
      latestSectorsByDriver.get(driver)!.push(sector);
    }
  }

  // Calculate pace for each driver across all sectors
  const driverPace = new Map<string, number[]>();
  for (const [driver, driverSectors] of latestSectorsByDriver) {
    const sortedSectors = driverSectors.sort((a, b) => a.sector_number - b.sector_number);
    driverPace.set(driver, sortedSectors.map((s) => s.sector_time));
  }

  // Find min/max for each sector to calculate relative performance
  const sectorMinMax = [
    { min: Infinity, max: -Infinity },
    { min: Infinity, max: -Infinity },
    { min: Infinity, max: -Infinity },
  ];

  for (const pace of driverPace.values()) {
    pace.forEach((time, idx) => {
      sectorMinMax[idx].min = Math.min(sectorMinMax[idx].min, time);
      sectorMinMax[idx].max = Math.max(sectorMinMax[idx].max, time);
    });
  }

  const getPerformanceColor = (sectorIdx: number, time: number) => {
    const minMax = sectorMinMax[sectorIdx];
    const delta = minMax.max - minMax.min;
    const ratio = (time - minMax.min) / (delta || 1);

    if (ratio < 0.02) return "bg-green-500/80";
    if (ratio < 0.15) return "bg-green-500/60";
    if (ratio < 0.30) return "bg-yellow-500/60";
    return "bg-orange-500/60";
  };

  return (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <h3 className="text-[10px] uppercase tracking-[2px] text-[var(--accent-muted)] font-semibold">
          Sector Analysis
        </h3>
      </div>

      <div className="p-5 space-y-4">
        {drivers.map((driver) => {
          const pace = driverPace.get(driver);
          if (!pace || pace.length === 0) return null;

          const totalTime = pace.reduce((a, b) => a + b, 0);
          const fastestSector = Math.min(...pace);
          const slowestSector = Math.max(...pace);

          return (
            <div key={driver} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-primary)]">{driver}</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {totalTime.toFixed(2)}s
                </span>
              </div>

              <div className="flex gap-1">
                {pace.map((time, sectorIdx) => {
                  const pct = (time / Math.max(...pace)) * 100;
                  const isWeakest = time === slowestSector;
                  const isStrongest = time === fastestSector;

                  return (
                    <div
                      key={sectorIdx}
                      className="flex-1 flex flex-col items-center group relative"
                    >
                      <div
                        className={`w-full h-8 rounded ${getPerformanceColor(
                          sectorIdx,
                          time
                        )} transition-opacity hover:opacity-100 opacity-80 flex items-center justify-center text-[9px] font-bold text-white/80`}
                      >
                        {time.toFixed(2)}s
                      </div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 whitespace-nowrap">
                        <div className="bg-[var(--bg-dropdown)] border border-[var(--border-strong)] rounded px-2 py-1 text-[9px] text-[var(--text-secondary)]">
                          S{sectorIdx + 1}: {time.toFixed(3)}s
                          {isStrongest && " ⚡"}
                          {isWeakest && " 🐢"}
                        </div>
                      </div>

                      <span className="text-[9px] text-[var(--text-muted)] mt-1">
                        S{sectorIdx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Performance summary */}
              <div className="text-[9px] text-[var(--text-muted)] flex justify-between">
                <span>
                  Fastest: S
                  {pace.indexOf(Math.min(...pace)) + 1}
                </span>
                <span>
                  Weakest: S
                  {pace.indexOf(Math.max(...pace)) + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-5 py-3 bg-[var(--bg-card-hover)] border-t border-[var(--border)] flex gap-4 text-[9px] text-[var(--text-muted)]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-green-500/80" />
          <span>Best</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-yellow-500/60" />
          <span>Mid</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-orange-500/60" />
          <span>Weakest</span>
        </div>
      </div>
    </div>
  );
}
