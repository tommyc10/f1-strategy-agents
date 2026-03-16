import type { DriverPosition } from "../lib/types";

export function PositionsCard({ positions }: { positions: DriverPosition[] }) {
  return (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--f1-border-strong)] rounded-xl p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-[9px] uppercase tracking-[1.5px] text-[var(--f1-accent-muted)] mb-3">
        Positions
      </h3>
      <div className="flex flex-col gap-1.5">
        {positions.slice(0, 10).map((p) => (
          <div
            key={p.driver}
            className={`flex justify-between items-center text-xs px-2 py-1 rounded-md ${
              p.position === 1 ? "bg-[var(--bg-highlight)]" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] w-4 text-[10px]">{p.position}</span>
              <span className="text-[var(--text-primary)] font-medium">{p.driver}</span>
            </div>
            <span className="text-[var(--text-secondary)] font-mono text-[11px]">
              +{p.gap_to_leader.toFixed(1)}s
            </span>
          </div>
        ))}
        {positions.length === 0 && (
          <p className="text-[var(--text-muted)] text-xs">No position data</p>
        )}
      </div>
    </div>
  );
}
