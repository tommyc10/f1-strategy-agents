import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Thermometer, Wind, CloudRain, Send, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { PaceTab } from "@/components/tabs/PaceTab";
import { SectorsTab } from "@/components/tabs/SectorsTab";
import { SuggestedQuestions } from "@/components/SuggestedQuestions";
import { AnalysisCard } from "@/components/AnalysisCard";
import { fetchRaceSummary, fetchSuggestions, fetchRaceEvents, type RaceSummary, type RaceEvent } from "@/lib/api";
import type { Session, RaceContext } from "@/lib/types";

type Analysis = { id: string; question: string; answer: string };

type Props = {
  session: Session;
  onAsk: (question: string) => void;
  loading: boolean;
  lastAnswer: string | null;
  raceContext?: RaceContext | null;
};

export function RaceReviewView({ session, onAsk, loading, lastAnswer }: Props) {
  const [summary, setSummary] = useState<RaceSummary | null>(null);
  const [fetching, setFetching] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFetching(true);
    setSummary(null);
    setAnalyses([]);
    setSuggestions([]);
    setRaceEvents([]);
    setActiveTab("overview");

    Promise.all([
      fetchRaceSummary(session.session_key),
      fetchSuggestions(session.session_key),
      fetchRaceEvents(session.session_key),
    ])
      .then(([sum, sugg, events]) => {
        setSummary(sum);
        setSuggestions(sugg);
        setRaceEvents(events);
      })
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

  useEffect(() => {
    if (analyses.length > 0) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [analyses.length]);

  const handleAsk = (question: string) => {
    setPendingQuestion(question);
    onAsk(question);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    handleAsk(input.trim());
    setInput("");
  };

  const sessionLabel = `${session.location} ${session.year}`;
  const w = summary?.weather;
  const totalLaps = Math.max(...(summary?.laps?.map((l) => l.lap_number) ?? [0]), 1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{session.location}</h2>
            <span className="text-sm text-muted-foreground">{session.date}</span>
            {summary && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest bg-card px-2 py-0.5 rounded">
                {summary.total_drivers} drivers
              </span>
            )}
          </div>
          {w && (
            <div className="flex items-center gap-4 text-[11px] text-secondary-foreground">
              <div className="flex items-center gap-1.5">
                <Thermometer size={12} className="text-muted-foreground" />
                <span className="font-mono">{w.track_temp}°</span>
                <span className="text-muted-foreground">track</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind size={12} className="text-muted-foreground" />
                <span className="font-mono">{w.air_temp}°</span>
                <span className="text-muted-foreground">air</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CloudRain size={12} className="text-muted-foreground" />
                <span className="font-mono">{w.rain_risk}%</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Split layout: Data tabs (left) + Analysis panel (right) */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Data tabs */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {fetching ? (
            <div className="flex-1 p-6">
              <div className="flex flex-col gap-4 max-w-6xl mx-auto">
                <Skeleton className="h-10 w-80 rounded-lg" />
                <Skeleton className="h-[200px] rounded-2xl" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-[160px] rounded-2xl" />
                  <Skeleton className="h-[160px] rounded-2xl" />
                </div>
              </div>
            </div>
          ) : summary ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-3">
                <TabsList className="bg-card/50 backdrop-blur-xl">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="pace">Pace</TabsTrigger>
                  <TabsTrigger value="sectors">Sectors</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto">
                  <TabsContent value="overview" className="mt-0">
                    <OverviewTab summary={summary} raceEvents={raceEvents} totalLaps={totalLaps} />
                  </TabsContent>
                  <TabsContent value="pace" className="mt-0">
                    <PaceTab summary={summary} />
                  </TabsContent>
                  <TabsContent value="sectors" className="mt-0">
                    <SectorsTab summary={summary} />
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No data available for this session</p>
            </div>
          )}
        </div>

        {/* Right: Analysis panel */}
        <div className="w-[400px] border-l border-border flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-semibold">Analysis</p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {loading && pendingQuestion && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                <span className="uppercase tracking-widest">Analysing...</span>
              </div>
            )}

            {analyses.map((a) => (
              <AnalysisCard key={a.id} question={a.question} answer={a.answer} />
            ))}

            {analyses.length === 0 && suggestions.length > 0 && (
              <div className="py-2">
                <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-semibold mb-3">
                  Suggested questions
                </p>
                <SuggestedQuestions suggestions={suggestions} onSelect={handleAsk} loading={loading} />
              </div>
            )}

            {analyses.length === 0 && suggestions.length === 0 && !fetching && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Ask a question to get started</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2 bg-card/50 backdrop-blur-xl border border-border rounded-full px-3 py-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Analyse ${sessionLabel}...`}
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <Button type="submit" size="icon" variant="ghost" disabled={loading || !input.trim()} className="rounded-full h-7 w-7 text-primary hover:bg-primary/20">
                <Send size={14} />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
