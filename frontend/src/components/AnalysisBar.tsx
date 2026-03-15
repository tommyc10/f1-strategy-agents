import { useState } from "react";
import { Send } from "lucide-react";

type Props = {
  onAsk: (question: string) => void;
  loading: boolean;
  sessionLabel: string;
};

export function AnalysisBar({ onAsk, loading, sessionLabel }: Props) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onAsk(input.trim());
    setInput("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/[0.06] px-6 py-3"
    >
      <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-full px-4 py-2 backdrop-blur-xl">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Analyse ${sessionLabel}... e.g. "When should Hamilton have pitted?"`}
          disabled={loading}
          className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 hover:bg-violet-500/30 transition-colors disabled:opacity-30"
        >
          <Send size={14} />
        </button>
      </div>
    </form>
  );
}
