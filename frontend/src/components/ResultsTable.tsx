import { motion } from "framer-motion";

type Position = {
  driver: string;
  position: number;
  gap_to_leader: number;
};

export function ResultsTable({ positions }: { positions: Position[] }) {
  return (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--accent-muted)] font-semibold">
          Classification
        </h2>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {positions.map((p, i) => (
          <motion.div
            key={p.driver}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`flex items-center px-5 py-2.5 text-sm ${
              p.position <= 3 ? "bg-[var(--bg-highlight)]" : ""
            }`}
          >
            <span
              className={`w-8 text-xs font-mono ${
                p.position === 1
                  ? "text-yellow-500"
                  : p.position === 2
                    ? "text-[var(--text-secondary)]"
                    : p.position === 3
                      ? "text-amber-600"
                      : "text-[var(--text-muted)]"
              }`}
            >
              P{p.position}
            </span>
            <span className="flex-1 text-[var(--text-primary)] font-medium">{p.driver}</span>
            <span className="text-[var(--text-muted)] font-mono text-xs">
              {p.position === 1 ? "LEADER" : `+${p.gap_to_leader.toFixed(1)}s`}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
