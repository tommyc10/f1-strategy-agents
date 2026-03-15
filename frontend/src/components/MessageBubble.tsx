import { motion } from "framer-motion";
import type { ChatMessage } from "../lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isEngineer = message.role === "engineer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`max-w-[80%] ${isEngineer ? "self-start" : "self-end"}`}
    >
      {isEngineer && (
        <span className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold mb-1 block">
          Race Engineer
        </span>
      )}
      <div
        className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isEngineer
            ? "bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl border-l-2 border-l-violet-500"
            : "bg-white/[0.06] border border-white/[0.08]"
        }`}
      >
        <p className="text-white/80">{message.content}</p>
      </div>
    </motion.div>
  );
}
