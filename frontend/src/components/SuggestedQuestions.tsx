import { motion } from "framer-motion";

type Props = {
  suggestions: string[];
  onSelect: (question: string) => void;
  loading: boolean;
};

export function SuggestedQuestions({ suggestions, onSelect, loading }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((q, i) => (
        <motion.button
          key={q}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(q)}
          disabled={loading}
          className="text-[11px] text-[var(--text-secondary)] bg-[var(--f1-accent-bg)] border border-[var(--f1-accent-bg-strong)] rounded-full px-3 py-1.5 hover:bg-[var(--f1-accent-bg-strong)] transition-colors disabled:opacity-40"
        >
          {q}
        </motion.button>
      ))}
    </div>
  );
}
