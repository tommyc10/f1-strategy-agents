import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { fetchSessions } from "../lib/api";
import type { Session } from "../lib/types";

type Props = {
  selected: Session | null;
  onSelect: (session: Session) => void;
};

export function SessionPicker({ selected, onSelect }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const label = selected
    ? `${selected.location} ${selected.year}`
    : "Select a race...";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-strong)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        <span>{loading ? "Loading..." : label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto rounded-xl bg-[var(--bg-dropdown)] border border-[var(--border-strong)] shadow-[var(--shadow-dropdown)] backdrop-blur-xl z-50"
          >
            {sessions.map((s) => (
              <button
                key={s.session_key}
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--bg-card-hover)] transition-colors border-b border-[var(--border)] last:border-0 ${
                  selected?.session_key === s.session_key ? "bg-[var(--accent-bg)] text-[var(--accent)]" : "text-[var(--text-secondary)]"
                }`}
              >
                <div className="font-medium">{s.location}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  {s.date} · {s.country}
                </div>
              </button>
            ))}
            {sessions.length === 0 && !loading && (
              <p className="text-[var(--text-muted)] text-xs p-4">No sessions found</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
