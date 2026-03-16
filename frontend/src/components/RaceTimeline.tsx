import { motion } from "framer-motion";

type RaceEvent = {
  lap: number;
  category: string;
  flag: string;
  message: string;
};

type Props = {
  events: RaceEvent[];
  totalLaps: number;
};

const EVENT_COLORS: Record<string, string> = {
  SafetyCar: "bg-yellow-500",
  Flag: "bg-red-500",
  Drs: "bg-green-500",
};

export function RaceTimeline({ events, totalLaps }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--f1-border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--f1-border)]">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--f1-accent-muted)] font-semibold">
          Race Events
        </h2>
      </div>

      <div className="px-5 py-4">
        <div className="relative h-6 bg-[var(--bg-input)] rounded-full overflow-hidden">
          {events.map((event, i) => {
            const pct = (event.lap / Math.max(totalLaps, 1)) * 100;
            return (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`absolute top-0 h-full w-1 ${EVENT_COLORS[event.category] || "bg-neutral-500"} group`}
                style={{ left: `${pct}%` }}
              >
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap">
                  <div className="bg-[var(--bg-dropdown)] border border-[var(--f1-border-strong)] rounded px-2 py-1 text-[9px] text-[var(--text-secondary)] shadow-lg">
                    L{event.lap}: {event.message || event.category}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-[8px] text-[var(--text-muted)]">
          <span>L1</span>
          <span>L{Math.round(totalLaps / 2)}</span>
          <span>L{totalLaps}</span>
        </div>
      </div>

      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {events.slice(0, 8).map((event, i) => (
          <span
            key={i}
            className="text-[9px] text-[var(--text-secondary)] bg-[var(--bg-card-hover)] border border-[var(--f1-border)] rounded px-2 py-0.5"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${EVENT_COLORS[event.category] || "bg-neutral-500"} mr-1`} />
            L{event.lap} {event.category}
          </span>
        ))}
      </div>
    </div>
  );
}
