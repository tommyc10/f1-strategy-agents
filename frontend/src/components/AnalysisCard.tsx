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
      className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <span className="text-[10px] uppercase tracking-[2px] text-violet-400/60 font-semibold">
          Analysis
        </span>
        <p className="text-sm text-white/50 mt-1">{question}</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-white/80 leading-relaxed">{answer}</p>
      </div>
    </motion.div>
  );
}
