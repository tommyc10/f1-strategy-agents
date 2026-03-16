import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "../lib/types";

type Props = {
  messages: ChatMessage[];
  onSend: (question: string) => void;
  loading: boolean;
  agentStatus: Record<string, string>;
};

export function ChatPanel({ messages, onSend, loading, agentStatus }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput("");
  };

  const activeAgent = Object.entries(agentStatus).find(([, s]) => s === "running");

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {loading && activeAgent && (
          <div className="text-xs text-[var(--accent-muted)] uppercase tracking-widest animate-pulse">
            {activeAgent[0]} agent running...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-full px-4 py-2 backdrop-blur-xl">
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
            className="w-8 h-8 rounded-full bg-[var(--accent-bg-strong)] flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent-bg-strong)] transition-colors disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
