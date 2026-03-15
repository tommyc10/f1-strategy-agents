import type { TyreStint } from "../lib/types";

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "text-red-400",
  MEDIUM: "text-yellow-400",
  HARD: "text-white/60",
  INTERMEDIATE: "text-green-400",
  WET: "text-blue-400",
};

export function TyresCard({ stints }: { stints: TyreStint[] }) {
  const latestByDriver = new Map<string, TyreStint>();
  for (const stint of stints) {
    const existing = latestByDriver.get(stint.driver);
    if (!existing || stint.stint_number > existing.stint_number) {
      latestByDriver.set(stint.driver, stint);
    }
  }

  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <h3 className="text-[9px] uppercase tracking-[1.5px] text-violet-400/50 mb-3">
        Tyres
      </h3>
      <div className="flex flex-col gap-1.5">
        {[...latestByDriver.values()].map((s) => (
          <div key={s.driver} className="flex justify-between items-center text-xs px-2">
            <span className="text-white font-medium">{s.driver}</span>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${COMPOUND_COLORS[s.compound] ?? "text-white/40"}`}>
                {s.compound[0]}
              </span>
              <span className="text-white/40 font-mono text-[11px]">L{s.tyre_age}</span>
            </div>
          </div>
        ))}
        {stints.length === 0 && (
          <p className="text-white/20 text-xs">No tyre data</p>
        )}
      </div>
    </div>
  );
}
