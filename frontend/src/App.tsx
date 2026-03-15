import { useState, useCallback, useEffect } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { SessionPicker } from "./components/SessionPicker";
import { useWebSocket } from "./hooks/useWebSocket";
import type { ChatMessage, RaceContext, Session } from "./lib/types";

function App() {
  const { connected, agentStatus, lastResult, error, loading, sendQuery } = useWebSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [raceContext, setRaceContext] = useState<RaceContext | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const handleSend = useCallback(
    (question: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      sendQuery(question, session?.session_key);
    },
    [sendQuery, session],
  );

  useEffect(() => {
    if (!lastResult) return;
    const engineerMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "engineer",
      content: lastResult.briefing,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, engineerMsg]);
    setRaceContext(lastResult.race_context);
  }, [lastResult]);

  return (
    <div className="h-screen bg-[#09090b] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">Strategy</h1>
          <SessionPicker selected={session} onSelect={setSession} />
          {connected && (
            <span className="text-[10px] text-violet-400/60 uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded">
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-[10px] text-white/30">{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0">
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            loading={loading}
            agentStatus={agentStatus}
          />
        </main>
        <div className="border-l border-white/[0.06]">
          <DashboardSidebar context={raceContext} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
