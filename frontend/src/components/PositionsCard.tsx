import type { DriverPosition } from "../lib/types";

export function PositionsCard({ positions }: { positions: DriverPosition[] }) {
  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <h3 className="text-[9px] uppercase tracking-[1.5px] text-violet-400/50 mb-3">
        Positions
      </h3>
      <div className="flex flex-col gap-1.5">
        {positions.slice(0, 10).map((p) => (
          <div
            key={p.driver}
            className={`flex justify-between items-center text-xs px-2 py-1 rounded-md ${
              p.position === 1 ? "bg-violet-500/[0.06]" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-white/20 w-4 text-[10px]">{p.position}</span>
              <span className="text-white font-medium">{p.driver}</span>
            </div>
            <span className="text-white/40 font-mono text-[11px]">
              +{p.gap_to_leader.toFixed(1)}s
            </span>
          </div>
        ))}
        {positions.length === 0 && (
          <p className="text-white/20 text-xs">No position data</p>
        )}
      </div>
    </div>
  );
}
