import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LapData = {
  driver: string;
  lap_number: number;
  lap_time: number;
};

type Props = {
  laps: LapData[];
  drivers: string[];
};

const DRIVER_COLORS = [
  "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#ec4899",
  "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

export function LapPaceChart({ laps, drivers }: Props) {
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(
    () => new Set(drivers.slice(0, 4))
  );

  if (laps.length === 0) return null;

  const toggleDriver = (driver: string) => {
    setSelectedDrivers((prev) => {
      const next = new Set(prev);
      if (next.has(driver)) next.delete(driver);
      else next.add(driver);
      return next;
    });
  };

  // Build chart data: each row = one lap number, with a column per driver
  const lapNumbers = [...new Set(laps.map((l) => l.lap_number))].sort((a, b) => a - b);
  const lapsByDriverAndLap = new Map<string, Map<number, number>>();
  for (const lap of laps) {
    if (!selectedDrivers.has(lap.driver)) continue;
    if (!lapsByDriverAndLap.has(lap.driver)) lapsByDriverAndLap.set(lap.driver, new Map());
    lapsByDriverAndLap.get(lap.driver)!.set(lap.lap_number, lap.lap_time);
  }

  const chartData = lapNumbers.map((lapNum) => {
    const row: Record<string, number> = { lap: lapNum };
    for (const driver of selectedDrivers) {
      const time = lapsByDriverAndLap.get(driver)?.get(lapNum);
      if (time !== undefined) row[driver] = time;
    }
    return row;
  });

  // Calculate Y domain: median ± range to exclude outliers (pit laps)
  const allTimes = chartData.flatMap((row) =>
    [...selectedDrivers].map((d) => row[d]).filter((v): v is number => v !== undefined)
  );
  allTimes.sort((a, b) => a - b);
  const median = allTimes[Math.floor(allTimes.length / 2)] || 80;
  const yMin = Math.floor(median - 5);
  const yMax = Math.ceil(median + 8);

  return (
    <Card className="bg-[var(--bg-card)] backdrop-blur-xl border-[var(--f1-border)] rounded-2xl overflow-hidden gap-0 py-0">
      <CardHeader className="px-5 py-3 border-b border-[var(--f1-border)] flex-row items-center justify-between flex-wrap gap-2 space-y-0 pb-3">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--f1-accent-muted)] font-semibold">
          Lap Pace
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {drivers.map((driver, i) => {
            const active = selectedDrivers.has(driver);
            return (
              <Button
                key={driver}
                variant="ghost"
                size="sm"
                onClick={() => toggleDriver(driver)}
                className={cn(
                  "text-[9px] font-semibold px-2 py-0.5 h-auto rounded-full border transition-all",
                  active
                    ? "border-transparent text-white hover:text-white"
                    : "border-[var(--f1-border)] text-[var(--text-muted)] opacity-40 hover:opacity-70 hover:bg-transparent"
                )}
                style={active ? { backgroundColor: DRIVER_COLORS[i % DRIVER_COLORS.length] } : {}}
              >
                {driver}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-4" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="lap"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--f1-border)" }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--f1-border)" }}
              tickFormatter={(v: number) => `${v.toFixed(1)}s`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-dropdown)",
                border: "1px solid var(--f1-border-strong)",
                borderRadius: 8,
                fontSize: 11,
                color: "var(--text-primary)",
              }}
              labelFormatter={(lap: number) => `Lap ${lap}`}
              formatter={(value: number, name: string) => [`${value.toFixed(3)}s`, name]}
            />
            {[...selectedDrivers].map((driver) => {
              const colorIdx = drivers.indexOf(driver);
              return (
                <Line
                  key={driver}
                  type="monotone"
                  dataKey={driver}
                  stroke={DRIVER_COLORS[colorIdx % DRIVER_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
