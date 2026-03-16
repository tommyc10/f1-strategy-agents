import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Thermometer, Wind, CloudRain } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { PaceTab } from "@/components/tabs/PaceTab";
import { SectorsTab } from "@/components/tabs/SectorsTab";
import { AnalysisTab } from "@/components/tabs/AnalysisTab";
import { AnalysisBar } from "@/components/AnalysisBar";
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
      setActiveTab("analysis");
    }
  }, [lastAnswer, pendingQuestion]);

  const handleAsk = (question: string) => {
    setPendingQuestion(question);
    onAsk(question);
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

      {/* Content */}
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
              <TabsTrigger value="analysis">
                Analysis
                {analyses.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-primary/20 text-primary rounded-full px-1.5">
                    {analyses.length}
                  </span>
                )}
              </TabsTrigger>
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
              <TabsContent value="analysis" className="mt-0">
                <AnalysisTab
                  suggestions={suggestions}
                  analyses={analyses}
                  loading={loading}
                  pendingQuestion={pendingQuestion}
                  onAsk={handleAsk}
                />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No data available for this session</p>
        </div>
      )}

      <AnalysisBar onAsk={handleAsk} loading={loading} sessionLabel={sessionLabel} />
    </div>
  );
}
