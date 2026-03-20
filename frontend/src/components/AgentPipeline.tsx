import { motion } from "framer-motion";
import { Database, Brain, Radio, Check } from "lucide-react";

type AgentState = "pending" | "running" | "complete";

type Props = {
  agentStatus: Record<string, AgentState>;
};

const STEPS = [
  { key: "data", label: "Race Data", icon: Database },
  { key: "strategy", label: "Strategy", icon: Brain },
  { key: "summariser", label: "Briefing", icon: Radio },
] as const;

export function AgentPipeline({ agentStatus }: Props) {
  return (
    <div className="flex items-center gap-1 py-2">
      {STEPS.map((step, i) => {
        const state: AgentState = agentStatus[step.key] || "pending";
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center gap-1">
            <motion.div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                state === "complete"
                  ? "bg-primary/15 text-primary"
                  : state === "running"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/30 text-muted-foreground/50"
              }`}
              animate={state === "running" ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
              transition={state === "running" ? { duration: 1.5, repeat: Infinity } : {}}
            >
              {state === "complete" ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                  <Check size={10} strokeWidth={3} />
                </motion.div>
              ) : (
                <Icon size={10} />
              )}
              <span className="uppercase tracking-wider">{step.label}</span>
            </motion.div>

            {i < STEPS.length - 1 && (
              <div className={`w-4 h-px transition-colors ${
                state === "complete" ? "bg-primary/40" : "bg-muted-foreground/15"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
