import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

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
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--accent-muted)] font-semibold">
          Head to Head
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={driverA}
            onChange={(e) => setDriverA(e.target.value)}
            className="text-[11px] bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] outline-none"
          >
            {drivers.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className="text-[10px] text-[var(--text-muted)]">vs</span>
          <select
            value={driverB}
            onChange={(e) => setDriverB(e.target.value)}
            className="text-[11px] bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] outline-none"
          >
            {drivers.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="p-4" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="lap"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              domain={[-maxGap, maxGap]}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}s`}
              width={50}
            />
            <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-dropdown)",
                border: "1px solid var(--border-strong)",
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
        <div className="flex justify-between text-[9px] text-[var(--text-muted)] mt-1 px-1">
          <span>&uarr; {driverA} faster</span>
          <span>&darr; {driverB} faster</span>
        </div>
      </div>
    </div>
  );
}
