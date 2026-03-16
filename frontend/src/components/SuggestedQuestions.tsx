import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

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
        <motion.div key={q} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(q)}
            disabled={loading}
            className="text-[11px] rounded-full border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {q}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
