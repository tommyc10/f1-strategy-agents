import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <form onSubmit={handleSubmit} className="border-t border-border px-6 py-3">
      <div className="flex items-center gap-3 bg-card/50 backdrop-blur-xl border border-border rounded-full px-4 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Analyse ${sessionLabel}... e.g. "When should Hamilton have pitted?"`}
          disabled={loading}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <Button type="submit" size="icon" variant="ghost" disabled={loading || !input.trim()} className="rounded-full h-8 w-8 text-primary hover:bg-primary/20">
          <Send size={14} />
        </Button>
      </div>
    </form>
  );
}
