import type { TyreStint } from "../lib/types";

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "text-[var(--compound-soft)]",
  MEDIUM: "text-[var(--compound-medium)]",
  HARD: "text-[var(--compound-hard)]",
  INTERMEDIATE: "text-[var(--compound-inter)]",
  WET: "text-[var(--compound-wet)]",
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
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--f1-border-strong)] rounded-xl p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-[9px] uppercase tracking-[1.5px] text-[var(--f1-accent-muted)] mb-3">
        Tyres
      </h3>
      <div className="flex flex-col gap-1.5">
        {[...latestByDriver.values()].map((s) => (
          <div key={s.driver} className="flex justify-between items-center text-xs px-2">
            <span className="text-[var(--text-primary)] font-medium">{s.driver}</span>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${COMPOUND_COLORS[s.compound] ?? "text-[var(--text-secondary)]"}`}>
                {s.compound[0]}
              </span>
              <span className="text-[var(--text-secondary)] font-mono text-[11px]">L{s.tyre_age}</span>
            </div>
          </div>
        ))}
        {stints.length === 0 && (
          <p className="text-[var(--text-muted)] text-xs">No tyre data</p>
        )}
      </div>
    </div>
  );
}
