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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.06] transition-colors"
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
            className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto rounded-xl bg-[#111113] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl z-50"
          >
            {sessions.map((s) => (
              <button
                key={s.session_key}
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0 ${
                  selected?.session_key === s.session_key ? "bg-violet-500/10 text-violet-400" : "text-white/70"
                }`}
              >
                <div className="font-medium">{s.location}</div>
                <div className="text-[10px] text-white/30 mt-0.5">
                  {s.date} · {s.country}
                </div>
              </button>
            ))}
            {sessions.length === 0 && !loading && (
              <p className="text-white/20 text-xs p-4">No sessions found</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
