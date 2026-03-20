import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import { AgentPipeline } from "./AgentPipeline";
import { useTypewriter } from "@/hooks/useTypewriter";
import type { ChatMessage } from "../lib/types";

type Props = {
  messages: ChatMessage[];
  onSend: (question: string) => void;
  loading: boolean;
  agentStatus: Record<string, string>;
  streamingText?: string;
};

export function ChatPanel({ messages, onSend, loading, agentStatus, streamingText = "" }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const revealedText = useTypewriter(streamingText, 2);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentStatus, revealedText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {loading && (
          <div className="space-y-3">
            <AgentPipeline agentStatus={agentStatus as Record<string, "pending" | "running" | "complete">} />
            {revealedText && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-[80%] bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--f1-border)] rounded-2xl px-4 py-3"
              >
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {revealedText}
                  <span className="inline-block w-1.5 h-4 bg-[var(--f1-accent)]/60 ml-0.5 animate-pulse rounded-sm" />
                </p>
              </motion.div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--f1-border)]">
        <div className="flex items-center gap-3 bg-[var(--bg-input)] border border-[var(--f1-border-strong)] rounded-full px-4 py-2 backdrop-blur-xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your engineer..."
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-full bg-[var(--f1-accent-bg-strong)] flex items-center justify-center text-[var(--f1-accent)] hover:bg-[var(--f1-accent-bg-strong)] transition-colors disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
