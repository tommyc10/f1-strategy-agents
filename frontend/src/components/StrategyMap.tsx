import { motion } from "framer-motion";

type Stint = {
  stint_number: number;
  compound: string;
  tyre_age: number;
  lap_start: number;
};

const COMPOUND_BG: Record<string, string> = {
  SOFT: "bg-red-500",
  MEDIUM: "bg-yellow-500",
  HARD: "bg-neutral-400",
  INTERMEDIATE: "bg-green-500",
  WET: "bg-blue-500",
};

export function StrategyMap({
  strategyMap,
}: {
  strategyMap: Record<string, Stint[]>;
}) {
  const drivers = Object.entries(strategyMap).sort(
    ([, a], [, b]) => b.reduce((sum, s) => sum + s.tyre_age, 0) - a.reduce((sum, s) => sum + s.tyre_age, 0),
  );

  const maxLaps = Math.max(
    ...drivers.map(([, stints]) => stints.reduce((sum, s) => sum + s.tyre_age, 0)),
    1,
  );

  return (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--accent-muted)] font-semibold">
          Strategy
        </h2>
        <div className="flex items-center gap-3">
          {["SOFT", "MEDIUM", "HARD"].map((c) => (
            <div key={c} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${COMPOUND_BG[c]}`} />
              <span className="text-[9px] text-[var(--text-muted)] uppercase">{c[0]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-1.5 overflow-x-auto">
        {drivers.map(([driver, stints], i) => {
          const totalLaps = stints.reduce((sum, s) => sum + s.tyre_age, 0);
          return (
            <motion.div
              key={driver}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.015 }}
              className="flex items-center gap-3"
            >
              <span className="w-10 text-xs text-[var(--text-secondary)] font-medium shrink-0">
                {driver}
              </span>
              <div className="flex-1 flex h-5 rounded overflow-hidden items-center">
                {stints.map((stint, stintIdx) => {
                  const widthPct = (stint.tyre_age / maxLaps) * 100;
                  return (
                    <div key={stint.stint_number} className="flex items-center" style={{ width: `${widthPct}%` }}>
                      {stintIdx > 0 && stint.lap_start > 0 && (
                        <div className="flex flex-col items-center mx-px shrink-0">
                          <span className="text-[7px] text-[var(--accent-muted)] font-mono leading-none">
                            {stint.lap_start}
                          </span>
                          <div className="w-px h-3 bg-[var(--accent)]/40" />
                        </div>
                      )}
                      <div
                        className={`flex-1 ${COMPOUND_BG[stint.compound] ?? "bg-neutral-500"} opacity-80 hover:opacity-100 transition-opacity relative group h-5 rounded-sm`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          {stint.tyre_age >= 5 && (
                            <span className="text-[9px] text-black/60 font-bold">
                              {stint.tyre_age}
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                          <div className="bg-[var(--bg-dropdown)] border border-[var(--border-strong)] rounded px-2 py-1 text-[10px] text-[var(--text-secondary)] whitespace-nowrap shadow-lg">
                            {stint.compound} · {stint.tyre_age} laps
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono w-8 text-right shrink-0">
                {totalLaps}L
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
