import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type Position = {
  driver: string;
  position: number;
  gap_to_leader: number;
};

const COLLAPSED_COUNT = 10;

export function ResultsTable({ positions }: { positions: Position[] }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = positions.length > COLLAPSED_COUNT;
  const visible = expanded ? positions : positions.slice(0, COLLAPSED_COUNT);

  return (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--f1-border)] rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3 border-b border-[var(--f1-border)]">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--f1-accent-muted)] font-semibold">
          Classification
        </h2>
      </div>
      <div className="divide-y divide-[var(--f1-border)] flex-1">
        {visible.map((p, i) => (
          <motion.div
            key={p.driver}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`flex items-center px-5 py-2 text-sm ${
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
            <span className="flex-1 text-[var(--text-primary)] font-medium text-[13px]">{p.driver}</span>
            <span className="text-[var(--text-muted)] font-mono text-xs">
              {p.position === 1 ? "LEADER" : `+${p.gap_to_leader.toFixed(1)}s`}
            </span>
          </motion.div>
        ))}
      </div>
      {canExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-1.5 py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors border-t border-[var(--f1-border)]"
        >
          <span>{expanded ? "Show less" : `+${positions.length - COLLAPSED_COUNT} more`}</span>
          <ChevronDown size={10} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
