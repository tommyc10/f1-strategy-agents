import { Loader2 } from "lucide-react";
import { SuggestedQuestions } from "@/components/SuggestedQuestions";
import { AnalysisCard } from "@/components/AnalysisCard";

type Analysis = { id: string; question: string; answer: string };

type Props = {
  suggestions: string[];
  analyses: Analysis[];
  loading: boolean;
  pendingQuestion: string | null;
  onAsk: (question: string) => void;
};

export function AnalysisTab({ suggestions, analyses, loading, pendingQuestion, onAsk }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {suggestions.length > 0 && analyses.length === 0 && (
        <div className="py-2">
          <p className="text-[10px] uppercase tracking-[2px] text-[var(--f1-accent-muted)] font-semibold mb-3">
            Suggested questions
          </p>
          <SuggestedQuestions suggestions={suggestions} onSelect={onAsk} loading={loading} />
        </div>
      )}

      {analyses.map((a) => (
        <AnalysisCard key={a.id} question={a.question} answer={a.answer} />
      ))}

      {loading && pendingQuestion && (
        <div className="flex items-center gap-2 text-xs text-[var(--f1-accent-muted)] animate-pulse">
          <Loader2 size={12} className="animate-spin" />
          <span className="uppercase tracking-widest">Analysing...</span>
        </div>
      )}

      {analyses.length === 0 && suggestions.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">Ask a question to get started</p>
        </div>
      )}
    </div>
  );
}
