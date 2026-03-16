type SectorTimeLocal = {
  driver: string;
  lap_number: number;
  sector_number: number;
  sector_time: number;
};

type Props = {
  sectors: SectorTimeLocal[];
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
  const latestSectorsByDriver = new Map<string, SectorTimeLocal[]>();
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

  const driverPace = new Map<string, number[]>();
  for (const [driver, driverSectors] of latestSectorsByDriver) {
    const sortedSectors = driverSectors.sort((a, b) => a.sector_number - b.sector_number);
    driverPace.set(driver, sortedSectors.map((s) => s.sector_time));
  }

  // Find min for each sector to calculate deltas
  const sectorBest = [Infinity, Infinity, Infinity];
  for (const pace of driverPace.values()) {
    pace.forEach((time, idx) => {
      if (idx < 3) sectorBest[idx] = Math.min(sectorBest[idx], time);
    });
  }

  const getPerformanceColor = (sectorIdx: number, time: number) => {
    const delta = time - sectorBest[sectorIdx];
    if (delta < 0.05) return "bg-green-500/80 text-white/90";
    if (delta < 0.3) return "bg-green-500/50 text-white/80";
    if (delta < 0.6) return "bg-yellow-500/50 text-white/80";
    return "bg-orange-500/50 text-white/80";
  };

  return (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-[2px] text-[var(--accent-muted)] font-semibold">
          Sector Pace
        </h3>
        <div className="flex gap-4 text-[9px] text-[var(--text-muted)]">
          <span>S1</span>
          <span>S2</span>
          <span>S3</span>
        </div>
      </div>

      <div className="flex-1 divide-y divide-[var(--border)]">
        {drivers.map((driver) => {
          const pace = driverPace.get(driver);
          if (!pace || pace.length === 0) return null;

          const totalTime = pace.reduce((a, b) => a + b, 0);

          return (
            <div key={driver} className="px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">{driver}</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {totalTime.toFixed(2)}s
                </span>
              </div>

              <div className="flex gap-1">
                {pace.map((time, sectorIdx) => {
                  const delta = time - sectorBest[sectorIdx];
                  return (
                    <div
                      key={sectorIdx}
                      className="flex-1 group relative"
                    >
                      <div
                        className={`w-full h-7 rounded-md ${getPerformanceColor(
                          sectorIdx,
                          time
                        )} flex items-center justify-center text-[9px] font-semibold transition-opacity hover:opacity-100 opacity-85`}
                      >
                        {time.toFixed(2)}s
                      </div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap">
                        <div className="bg-[var(--bg-dropdown)] border border-[var(--border-strong)] rounded px-2 py-1 text-[9px] text-[var(--text-secondary)] shadow-lg">
                          S{sectorIdx + 1}: {time.toFixed(3)}s
                          {delta < 0.05 ? " — fastest" : ` +${delta.toFixed(3)}s`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-5 py-2.5 bg-[var(--bg-card-hover)] border-t border-[var(--border)] flex gap-4 text-[9px] text-[var(--text-muted)]">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500/80" />
          <span>Best</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
          <span>Mid</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60" />
          <span>Off-pace</span>
        </div>
      </div>
    </div>
  );
}
