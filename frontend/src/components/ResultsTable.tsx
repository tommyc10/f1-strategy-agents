import { motion } from "framer-motion";

type Position = {
  driver: string;
  position: number;
  gap_to_leader: number;
};

export function ResultsTable({ positions }: { positions: Position[] }) {
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <h2 className="text-[10px] uppercase tracking-[2px] text-violet-400/60 font-semibold">
          Classification
        </h2>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {positions.map((p, i) => (
          <motion.div
            key={p.driver}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`flex items-center px-5 py-2.5 text-sm ${
              p.position <= 3 ? "bg-white/[0.02]" : ""
            }`}
          >
            <span
              className={`w-8 text-xs font-mono ${
                p.position === 1
                  ? "text-yellow-400"
                  : p.position === 2
                    ? "text-white/50"
                    : p.position === 3
                      ? "text-amber-600"
                      : "text-white/20"
              }`}
            >
              P{p.position}
            </span>
            <span className="flex-1 text-white font-medium">{p.driver}</span>
            <span className="text-white/30 font-mono text-xs">
              {p.position === 1 ? "LEADER" : `+${p.gap_to_leader.toFixed(1)}s`}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
