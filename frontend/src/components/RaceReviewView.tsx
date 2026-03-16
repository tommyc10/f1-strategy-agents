import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ResultsTable } from "./ResultsTable";
import { StrategyMap } from "./StrategyMap";
import { WeatherCard } from "./WeatherCard";
import { SectorBreakdown } from "./SectorBreakdown";
import { AnalysisBar } from "./AnalysisBar";
import { AnalysisCard } from "./AnalysisCard";
import { fetchRaceSummary, type RaceSummary } from "../lib/api";
import type { Session, RaceContext } from "../lib/types";

type Analysis = { id: string; question: string; answer: string };

type Props = {
  session: Session;
  onAsk: (question: string) => void;
  loading: boolean;
  lastAnswer: string | null;
  raceContext?: RaceContext | null;
};

export function RaceReviewView({ session, onAsk, loading, lastAnswer, raceContext }: Props) {
  const [summary, setSummary] = useState<RaceSummary | null>(null);
  const [fetching, setFetching] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  useEffect(() => {
    setFetching(true);
    setSummary(null);
    setAnalyses([]);
    fetchRaceSummary(session.session_key)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setFetching(false));
  }, [session.session_key]);

  useEffect(() => {
    if (lastAnswer && pendingQuestion) {
      setAnalyses((prev) => [
        { id: crypto.randomUUID(), question: pendingQuestion, answer: lastAnswer },
        ...prev,
      ]);
      setPendingQuestion(null);
    }
  }, [lastAnswer, pendingQuestion]);

  const handleAsk = (question: string) => {
    setPendingQuestion(question);
    onAsk(question);
  };

  if (fetching) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">No data available for this session</p>
      </div>
    );
  }

  const sessionLabel = `${session.location} ${session.year}`;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-baseline gap-3"
        >
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{session.location}</h2>
          <span className="text-sm text-[var(--text-muted)]">{session.date}</span>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-card)] px-2 py-0.5 rounded">
            {summary.total_drivers} drivers
          </span>
        </motion.div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          <div className="lg:col-span-1">
            <ResultsTable positions={summary.positions} />
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <StrategyMap strategyMap={summary.strategy_map} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.sectors && summary.sectors.length > 0 && (
                <SectorBreakdown
                  sectors={summary.sectors}
                  drivers={summary.positions.slice(0, 5).map((p) => p.driver)}
                />
              )}

              {summary.weather && (
                <WeatherCard weather={summary.weather} />
              )}
            </div>

            {analyses.map((a) => (
              <AnalysisCard key={a.id} question={a.question} answer={a.answer} />
            ))}

            {loading && pendingQuestion && (
              <div className="flex items-center gap-2 text-xs text-[var(--accent-muted)] animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                <span className="uppercase tracking-widest">Analysing...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnalysisBar onAsk={handleAsk} loading={loading} sessionLabel={sessionLabel} />
    </div>
  );
}
