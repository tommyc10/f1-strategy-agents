import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

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
    >
      <Card className="bg-[var(--bg-card)] backdrop-blur-xl border-[var(--f1-accent-bg-strong)] rounded-2xl overflow-hidden gap-0 py-0">
        <CardHeader className="px-5 py-3 border-b border-[var(--f1-border)] flex-row items-center gap-3 space-y-0 pb-3">
          <div className="w-1 h-4 rounded-full bg-[var(--f1-accent)]" />
          <div>
            <span className="text-[10px] uppercase tracking-[2px] text-[var(--f1-accent-muted)] font-semibold">
              Analysis
            </span>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{question}</p>
          </div>
        </CardHeader>
        <CardContent className="px-5 py-4 space-y-2.5">
          {answer.split("\n").filter(Boolean).map((paragraph, i) => (
            <p key={i} className="text-[13px] text-[var(--text-primary)] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
