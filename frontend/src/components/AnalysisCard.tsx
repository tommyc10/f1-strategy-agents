import { motion } from "framer-motion";

type Props = {
  question: string;
  answer: string;
};

export function AnalysisCard({ question, answer }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <span className="text-[10px] uppercase tracking-[2px] text-[var(--accent-muted)] font-semibold">
          Analysis
        </span>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{question}</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{answer}</p>
      </div>
    </motion.div>
  );
}
