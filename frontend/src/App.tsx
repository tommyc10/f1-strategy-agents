import { useState, useCallback, useEffect } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { SessionPicker } from "./components/SessionPicker";
import { RaceReviewView } from "./components/RaceReviewView";
import { ThemeToggle } from "./components/ThemeToggle";
import { useWebSocket } from "./hooks/useWebSocket";
import { useTheme } from "./hooks/useTheme";
import type { ChatMessage, RaceContext, Session } from "./lib/types";

function App() {
  const { connected, agentStatus, lastResult, error, loading, sendQuery } = useWebSocket();
  const { theme, toggle: toggleTheme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [raceContext, setRaceContext] = useState<RaceContext | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [lastBriefing, setLastBriefing] = useState<string | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<{ role: string; content: string }[]>([]);

  const isHistorical = session !== null;

  const handleSend = useCallback(
    (question: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLastBriefing(null);
      sendQuery(question, session?.session_key);
    },
    [sendQuery, session],
  );

  const handleHistoricalAsk = useCallback(
    (question: string) => {
      setLastBriefing(null);
      setAnalysisHistory((prev) => [...prev, { role: "user", content: question }]);
      sendQuery(question, session?.session_key, true, analysisHistory);
    },
    [sendQuery, session, analysisHistory],
  );

  useEffect(() => {
    if (!lastResult) return;

    setLastBriefing(lastResult.briefing);
    setRaceContext(lastResult.race_context);

    if (isHistorical) {
      setAnalysisHistory((prev) => [...prev, { role: "assistant", content: lastResult.briefing }]);
    }

    if (!isHistorical) {
      const engineerMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "engineer",
        content: lastResult.briefing,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, engineerMsg]);
    }
  }, [lastResult, isHistorical]);

  const handleSessionSelect = (s: Session) => {
    setSession(s);
    setMessages([]);
    setRaceContext(null);
    setLastBriefing(null);
    setAnalysisHistory([]);
  };

  const handleClearSession = () => {
    setSession(null);
    setMessages([]);
    setRaceContext(null);
    setLastBriefing(null);
    setAnalysisHistory([]);
  };

  return (
    <div className="h-screen bg-[var(--bg-root)] text-[var(--text-primary)] flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--f1-border)]">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">Strategy</h1>
          <SessionPicker selected={session} onSelect={handleSessionSelect} />
          {isHistorical ? (
            <button
              onClick={handleClearSession}
              className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-secondary)] transition-colors"
            >
              &larr; Live
            </button>
          ) : (
            connected && (
              <span className="text-[10px] text-[var(--f1-accent-muted)] uppercase tracking-widest bg-[var(--f1-accent-bg)] px-2 py-0.5 rounded">
                Live
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-[10px] text-[var(--text-muted)]">{connected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      {isHistorical ? (
        <RaceReviewView
          session={session}
          onAsk={handleHistoricalAsk}
          loading={loading}
          lastAnswer={lastBriefing}
          raceContext={raceContext}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 flex flex-col min-w-0">
            <ChatPanel
              messages={messages}
              onSend={handleSend}
              loading={loading}
              agentStatus={agentStatus}
            />
          </main>
          <div className="border-l border-[var(--f1-border)]">
            <DashboardSidebar context={raceContext} />
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="px-6 py-2 bg-[var(--bg-error)] border-t border-[var(--f1-border-error)] text-red-500 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
