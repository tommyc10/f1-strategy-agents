import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchSessions } from "@/lib/api";
import type { Session } from "@/lib/types";

type Props = {
  selected: Session | null;
  onSelect: (session: Session) => void;
};

export function SessionPicker({ selected, onSelect }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Select
      value={selected?.session_key ?? ""}
      onValueChange={(key) => {
        const s = sessions.find((s) => s.session_key === key);
        if (s) onSelect(s);
      }}
    >
      <SelectTrigger className="w-56 bg-card/50 backdrop-blur-xl border-border text-sm">
        <SelectValue placeholder={loading ? "Loading..." : "Select a race..."} />
      </SelectTrigger>
      <SelectContent className="bg-popover/95 backdrop-blur-xl border-border">
        {sessions.map((s) => (
          <SelectItem key={s.session_key} value={s.session_key}>
            <span className="font-medium">{s.location}</span>
            <span className="text-muted-foreground text-[10px] ml-2">{s.date} · {s.country}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
