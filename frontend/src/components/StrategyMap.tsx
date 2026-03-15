import { motion } from "framer-motion";

type Stint = {
  stint_number: number;
  compound: string;
  tyre_age: number;
};

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "bg-red-500",
  MEDIUM: "bg-yellow-500",
  HARD: "bg-white/60",
  INTERMEDIATE: "bg-green-500",
  WET: "bg-blue-500",
};

const COMPOUND_TEXT: Record<string, string> = {
  SOFT: "text-red-400",
  MEDIUM: "text-yellow-400",
  HARD: "text-white/50",
  INTERMEDIATE: "text-green-400",
  WET: "text-blue-400",
};

export function StrategyMap({
  strategyMap,
}: {
  strategyMap: Record<string, Stint[]>;
}) {
  const drivers = Object.entries(strategyMap).sort(
    ([, a], [, b]) => b.reduce((sum, s) => sum + s.tyre_age, 0) - a.reduce((sum, s) => sum + s.tyre_age, 0),
  );

  // Find max total laps for scaling bars
  const maxLaps = Math.max(
    ...drivers.map(([, stints]) => stints.reduce((sum, s) => sum + s.tyre_age, 0)),
    1,
  );

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-[2px] text-violet-400/60 font-semibold">
          Strategy
        </h2>
        <div className="flex items-center gap-3">
          {["SOFT", "MEDIUM", "HARD"].map((c) => (
            <div key={c} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${COMPOUND_COLORS[c]}`} />
              <span className="text-[9px] text-white/30 uppercase">{c[0]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-1.5">
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
              <span className="w-10 text-xs text-white/60 font-medium shrink-0">
                {driver}
              </span>
              <div className="flex-1 flex h-5 rounded overflow-hidden">
                {stints.map((stint) => {
                  const widthPct = (stint.tyre_age / maxLaps) * 100;
                  return (
                    <div
                      key={stint.stint_number}
                      className={`${COMPOUND_COLORS[stint.compound] ?? "bg-white/20"} opacity-80 hover:opacity-100 transition-opacity relative group`}
                      style={{ width: `${widthPct}%` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        {stint.tyre_age >= 5 && (
                          <span className="text-[9px] text-black/60 font-bold">
                            {stint.tyre_age}
                          </span>
                        )}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                        <div className="bg-[#1a1a1d] border border-white/10 rounded px-2 py-1 text-[10px] text-white/70 whitespace-nowrap shadow-lg">
                          <span className={COMPOUND_TEXT[stint.compound]}>
                            {stint.compound}
                          </span>{" "}
                          · {stint.tyre_age} laps
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px] text-white/20 font-mono w-8 text-right shrink-0">
                {totalLaps}L
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
