import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type LapData = { driver: string; lap_number: number; lap_time: number };
type Position = { driver: string; position: number; gap_to_leader: number };

type Props = {
  laps: LapData[];
  positions: Position[];
};

export function DriverComparison({ laps, positions }: Props) {
  const drivers = positions.map((p) => p.driver);
  const [driverA, setDriverA] = useState(drivers[0] || "");
  const [driverB, setDriverB] = useState(drivers[1] || "");

  if (laps.length === 0 || drivers.length < 2) return null;

  // Build cumulative time delta: positive = driverA ahead
  const lapNumbers = [...new Set(laps.map((l) => l.lap_number))].sort((a, b) => a - b);
  const timesA = new Map<number, number>();
  const timesB = new Map<number, number>();
  for (const lap of laps) {
    if (lap.driver === driverA) timesA.set(lap.lap_number, lap.lap_time);
    if (lap.driver === driverB) timesB.set(lap.lap_number, lap.lap_time);
  }

  let cumulativeDelta = 0;
  const chartData = lapNumbers
    .filter((n) => timesA.has(n) && timesB.has(n))
    .map((lapNum) => {
      const delta = timesB.get(lapNum)! - timesA.get(lapNum)!;
      cumulativeDelta += delta;
      return { lap: lapNum, gap: parseFloat(cumulativeDelta.toFixed(3)) };
    });

  const maxGap = Math.max(...chartData.map((d) => Math.abs(d.gap)), 1);

  return (
    <Card className="bg-[var(--bg-card)] backdrop-blur-xl border-[var(--f1-border)] rounded-2xl overflow-hidden gap-0 py-0">
      <CardHeader className="px-5 py-3 border-b border-[var(--f1-border)] flex-row items-center justify-between flex-wrap gap-2 space-y-0 pb-3">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--f1-accent-muted)] font-semibold">
          Head to Head
        </h2>
        <div className="flex items-center gap-2">
          <Select value={driverA} onValueChange={setDriverA}>
            <SelectTrigger
              size="sm"
              className="text-[11px] bg-[var(--bg-input)] border-[var(--f1-border)] text-[var(--text-primary)] h-7 min-w-[80px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-[var(--text-muted)]">vs</span>
          <Select value={driverB} onValueChange={setDriverB}>
            <SelectTrigger
              size="sm"
              className="text-[11px] bg-[var(--bg-input)] border-[var(--f1-border)] text-[var(--text-primary)] h-7 min-w-[80px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-4 pb-2">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="lap"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--f1-border)" }}
              />
              <YAxis
                domain={[-maxGap, maxGap]}
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--f1-border)" }}
                tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}s`}
                width={50}
              />
              <ReferenceLine y={0} stroke="var(--f1-border-strong)" strokeDasharray="3 3" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-dropdown)",
                  border: "1px solid var(--f1-border-strong)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "var(--text-primary)",
                }}
                labelFormatter={(lap: number) => `Lap ${lap}`}
                formatter={(value: number) => {
                  const ahead = value > 0 ? driverA : driverB;
                  return [`${Math.abs(value).toFixed(3)}s — ${ahead} ahead`, "Gap"];
                }}
              />
              <Line
                type="monotone"
                dataKey="gap"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-[9px] text-[var(--text-muted)] mt-1 px-1">
          <span>&uarr; {driverA} faster</span>
          <span>&darr; {driverB} faster</span>
        </div>
      </CardContent>
    </Card>
  );
}
