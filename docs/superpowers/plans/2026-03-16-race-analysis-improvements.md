# Race Analysis Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the F1 strategy app from a basic query tool into a comprehensive race analysis platform with interactive charts, smarter AI context, and polished UX.

**Architecture:** Six independent feature streams that can be developed in parallel. Each adds a new capability without breaking existing functionality. Backend changes are minimal — mostly new endpoints and prompt improvements. Frontend adds recharts for data visualization, skeleton loading states, and responsive layout improvements.

**Tech Stack:** React 19, recharts (new), Tailwind CSS 4, Framer Motion, FastAPI, Google Gemini 2.0 Flash, OpenF1 API

---

## File Structure

### New Files
- `frontend/src/components/LapPaceChart.tsx` — Line chart of lap times per driver
- `frontend/src/components/DriverComparison.tsx` — Head-to-head driver comparison panel
- `frontend/src/components/SuggestedQuestions.tsx` — Smart prompt suggestions
- `frontend/src/components/RaceTimeline.tsx` — Key race events timeline
- `frontend/src/components/SkeletonCard.tsx` — Reusable loading skeleton
- `backend/app/services/cache.py` — In-memory session cache

### Modified Files
- `frontend/package.json` — Add recharts dependency
- `frontend/src/lib/api.ts` — New API functions (suggestions, race events)
- `frontend/src/lib/types.ts` — New types (RaceEvent, Suggestion)
- `frontend/src/components/RaceReviewView.tsx` — Integrate new components, skeleton loading
- `frontend/src/components/StrategyMap.tsx` — Add pit lap markers
- `frontend/src/components/AnalysisBar.tsx` — Suggested questions integration
- `frontend/src/components/SessionPicker.tsx` — Show winner + enriched info
- `frontend/src/hooks/useWebSocket.ts` — Conversation history in messages
- `frontend/src/App.tsx` — Pass conversation history, mobile responsive
- `backend/app/agents/data_agent.py` — Use session cache
- `backend/app/agents/strategy_agent.py` — Accept conversation history in prompts
- `backend/app/routers/data.py` — New endpoints (suggestions, race-events)
- `backend/app/main.py` — Pass conversation history through WebSocket pipeline
- `backend/app/services/openf1.py` — New fetch_race_control endpoint

---

## Chunk 1: Session Caching + Charting Setup

### Task 1: Install recharts

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install recharts**

```bash
cd frontend && npm install recharts
```

- [ ] **Step 2: Verify build still works**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts dependency for lap pace charts"
```

---

### Task 2: Session cache service

**Files:**
- Create: `backend/app/services/cache.py`
- Modify: `backend/app/agents/data_agent.py`

- [ ] **Step 1: Create cache module**

```python
# backend/app/services/cache.py
import logging
import time

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[float, object]] = {}
TTL_SECONDS = 300  # 5 minutes


def get(key: str) -> object | None:
    entry = _cache.get(key)
    if entry is None:
        return None
    timestamp, value = entry
    if time.monotonic() - timestamp > TTL_SECONDS:
        del _cache[key]
        return None
    logger.info("Cache hit: %s", key)
    return value


def put(key: str, value: object) -> None:
    _cache[key] = (time.monotonic(), value)
    logger.info("Cache set: %s", key)


def clear() -> None:
    _cache.clear()
```

- [ ] **Step 2: Integrate cache in data_agent.py**

In `backend/app/agents/data_agent.py`, wrap `fetch_race_context` to check cache first:

```python
# Add import at top
from app.services import cache

# In fetch_race_context, after determining session_key:
# Check cache
cache_key = f"race_context:{session_key}"
cached = cache.get(cache_key)
if cached is not None:
    ctx = cached
    # Still filter by drivers if requested
    if drivers:
        driver_codes = set(drivers)
        ctx = RaceContext(
            session_key=ctx.session_key,
            positions=[p for p in ctx.positions if p.driver in driver_codes],
            stints=[s for s in ctx.stints if s.driver in driver_codes],
            laps=[l for l in ctx.laps if l.driver in driver_codes],
            sectors=[s for s in ctx.sectors if s.driver in driver_codes],
            weather=ctx.weather,
        )
    return ctx

# ... existing fetch logic ...

# Before return, cache the full result (before driver filtering)
cache.put(cache_key, result)
# Then apply driver filter if needed
```

- [ ] **Step 3: Run tests**

```bash
cd backend && venv/bin/pytest tests/ -v
```

- [ ] **Step 4: Commit**

```bash
git add app/services/cache.py app/agents/data_agent.py
git commit -m "feat: add in-memory session cache for race context (5min TTL)"
```

---

## Chunk 2: Lap Pace Chart

### Task 3: LapPaceChart component

**Files:**
- Create: `frontend/src/components/LapPaceChart.tsx`
- Modify: `frontend/src/components/RaceReviewView.tsx`

- [ ] **Step 1: Create LapPaceChart component**

```tsx
// frontend/src/components/LapPaceChart.tsx
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type LapData = {
  driver: string;
  lap_number: number;
  lap_time: number;
};

type Props = {
  laps: LapData[];
  drivers: string[];
};

// 6 visually distinct colors that work on dark and light backgrounds
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
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--accent-muted)] font-semibold">
          Lap Pace
        </h2>
        <div className="flex flex-wrap gap-2">
          {drivers.map((driver, i) => {
            const active = selectedDrivers.has(driver);
            return (
              <button
                key={driver}
                onClick={() => toggleDriver(driver)}
                className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                  active
                    ? "border-transparent text-white"
                    : "border-[var(--border)] text-[var(--text-muted)] opacity-40 hover:opacity-70"
                }`}
                style={active ? { backgroundColor: DRIVER_COLORS[i % DRIVER_COLORS.length] } : {}}
              >
                {driver}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="lap"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              label={{ value: "Lap", position: "insideBottomRight", offset: -5, fontSize: 9, fill: "var(--text-muted)" }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tickFormatter={(v: number) => `${v.toFixed(1)}s`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-dropdown)",
                border: "1px solid var(--border-strong)",
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
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add laps to RaceSummary type and API response**

In `frontend/src/lib/api.ts`, add `laps` to `RaceSummary`:

```typescript
export type RaceSummary = {
  // ... existing fields ...
  laps: { driver: string; lap_number: number; lap_time: number }[];
};
```

In `backend/app/routers/data.py`, add laps to race-summary response:

```python
# In race_summary endpoint, add to return dict:
"laps": [l.model_dump() for l in context.laps],
```

- [ ] **Step 3: Integrate into RaceReviewView**

In `frontend/src/components/RaceReviewView.tsx`, add after StrategyMap:

```tsx
import { LapPaceChart } from "./LapPaceChart";

// In the layout, after StrategyMap:
{summary.laps && summary.laps.length > 0 && (
  <LapPaceChart
    laps={summary.laps}
    drivers={summary.positions.slice(0, 6).map((p) => p.driver)}
  />
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add interactive lap pace chart with driver toggles"
```

---

## Chunk 3: Pit Window Overlay + Driver Comparison

### Task 4: Pit lap markers on StrategyMap

**Files:**
- Modify: `frontend/src/components/StrategyMap.tsx`

- [ ] **Step 1: Add pit lap markers**

In `StrategyMap.tsx`, add visual pit lap indicators between stints. Modify the stint rendering to show a thin divider line with the pit lap number at each stint boundary:

```tsx
// Inside the stint rendering loop, between stint bars, add:
{stintIdx > 0 && (
  <div className="relative flex items-center justify-center w-px mx-0.5 bg-[var(--accent)]/30">
    <span className="absolute -top-4 text-[8px] text-[var(--accent-muted)] font-mono whitespace-nowrap">
      L{stint.lap_start || "?"}
    </span>
  </div>
)}
```

This requires adding `lap_start` to the Stint type and including it in the strategy_map API response.

In `backend/app/routers/data.py`, update strategy_map to include `lap_start`:

```python
strategy_map[stint.driver].append({
    "stint_number": stint.stint_number,
    "compound": stint.compound.value,
    "tyre_age": stint.tyre_age,
    "lap_start": stint.lap_start,  # ADD THIS
})
```

In `frontend/src/components/StrategyMap.tsx`, update the Stint type:

```typescript
type Stint = {
  stint_number: number;
  compound: string;
  tyre_age: number;
  lap_start: number;  // ADD THIS
};
```

- [ ] **Step 2: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
git add -A
git commit -m "feat: add pit lap markers to strategy map"
```

---

### Task 5: Driver head-to-head comparison

**Files:**
- Create: `frontend/src/components/DriverComparison.tsx`
- Modify: `frontend/src/components/RaceReviewView.tsx`

- [ ] **Step 1: Create DriverComparison component**

```tsx
// frontend/src/components/DriverComparison.tsx
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

  // Build cumulative time delta: positive = driverA ahead, negative = driverB ahead
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
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--accent-muted)] font-semibold">
          Head to Head
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={driverA}
            onChange={(e) => setDriverA(e.target.value)}
            className="text-[11px] bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] outline-none"
          >
            {drivers.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <span className="text-[10px] text-[var(--text-muted)]">vs</span>
          <select
            value={driverB}
            onChange={(e) => setDriverB(e.target.value)}
            className="text-[11px] bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] outline-none"
          >
            {drivers.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
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
          <span>{driverA} faster &uarr;</span>
          <span>{driverB} faster &darr;</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add to RaceReviewView after LapPaceChart**

```tsx
import { DriverComparison } from "./DriverComparison";

// After LapPaceChart:
{summary.laps && summary.laps.length > 0 && (
  <DriverComparison
    laps={summary.laps}
    positions={summary.positions}
  />
)}
```

- [ ] **Step 3: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
git add -A
git commit -m "feat: add driver head-to-head gap comparison chart"
```

---

## Chunk 4: Conversation Memory + Suggested Questions

### Task 6: Conversation memory

**Files:**
- Modify: `frontend/src/hooks/useWebSocket.ts`
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `backend/app/main.py`
- Modify: `backend/app/agents/strategy_agent.py`

- [ ] **Step 1: Add history to WsMessage type**

In `frontend/src/lib/types.ts`, update the query message:

```typescript
export type WsMessage =
  | { type: "query"; question: string; session_key?: string; is_historical?: boolean; history?: { role: string; content: string }[] }
  // ... rest unchanged
```

- [ ] **Step 2: Pass history through useWebSocket**

In `frontend/src/hooks/useWebSocket.ts`, update `sendQuery`:

```typescript
const sendQuery = useCallback((
  question: string,
  sessionKey?: string,
  isHistorical?: boolean,
  history?: { role: string; content: string }[],
) => {
  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
  setLoading(true);
  setError(null);
  setLastResult(null);
  setAgentStatus({});
  const msg: WsMessage = {
    type: "query", question, session_key: sessionKey,
    is_historical: isHistorical, history,
  };
  wsRef.current.send(JSON.stringify(msg));
}, []);
```

- [ ] **Step 3: Build history from analyses in App.tsx**

In `frontend/src/App.tsx`, in `handleHistoricalAsk`, pass the previous Q&A pairs. First, lift `analyses` state up from RaceReviewView to App.tsx, or pass a ref. Simpler approach: track history at App level.

Add state:

```typescript
const [analysisHistory, setAnalysisHistory] = useState<{ role: string; content: string }[]>([]);
```

Update handleHistoricalAsk:

```typescript
const handleHistoricalAsk = useCallback(
  (question: string) => {
    setLastBriefing(null);
    const history = analysisHistory.slice(-6); // last 3 Q&A pairs
    sendQuery(question, session?.session_key, true, history);
    setAnalysisHistory((prev) => [...prev, { role: "user", content: question }]);
  },
  [sendQuery, session, analysisHistory],
);
```

Update the lastResult effect to append assistant response:

```typescript
useEffect(() => {
  if (!lastResult) return;
  setLastBriefing(lastResult.briefing);
  setRaceContext(lastResult.race_context);
  if (isHistorical) {
    setAnalysisHistory((prev) => [...prev, { role: "assistant", content: lastResult.briefing }]);
  }
  // ... rest unchanged
}, [lastResult, isHistorical]);
```

Clear on session change:

```typescript
const handleSessionSelect = (s: Session) => {
  setSession(s);
  setMessages([]);
  setRaceContext(null);
  setLastBriefing(null);
  setAnalysisHistory([]); // ADD
};
```

- [ ] **Step 4: Read history in backend WebSocket handler**

In `backend/app/main.py`, extract history from the message and pass it through:

```python
history = data.get("history", [])
# Pass to strategy agent
```

Update the strategy call in the WebSocket handler to pass history.

- [ ] **Step 5: Include history in strategy agent prompt**

In `backend/app/agents/strategy_agent.py`, update `analyse_historical`:

```python
async def analyse_historical(question: str, race_context: RaceContext, history: list[dict] | None = None) -> StrategyOutput:
    context_text = _format_historical_context(race_context, question)

    # Build conversation context
    history_text = ""
    if history:
        history_text = "\n\nPrevious conversation:\n"
        for msg in history[-6:]:  # last 3 exchanges
            role = "User" if msg["role"] == "user" else "Analyst"
            history_text += f"{role}: {msg['content'][:300]}\n"

    user_message = f"{context_text}{history_text}\n\nAnalyze: {question}"
    # ... rest unchanged
```

- [ ] **Step 6: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
cd ../backend && venv/bin/pytest tests/ -v
git add -A
git commit -m "feat: add conversation memory for historical analysis context"
```

---

### Task 7: Suggested questions

**Files:**
- Create: `frontend/src/components/SuggestedQuestions.tsx`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/components/RaceReviewView.tsx`
- Modify: `backend/app/routers/data.py`

- [ ] **Step 1: Add backend endpoint that generates suggestions from race data**

In `backend/app/routers/data.py`, add:

```python
@router.get("/data/suggestions")
async def get_suggestions(session_key: str):
    context = await fetch_race_context(session_key=session_key)

    suggestions = []

    # Winner analysis
    if context.positions:
        winner = context.positions[0].driver
        suggestions.append(f"How did {winner} win this race?")

    # Close battle
    for i in range(len(context.positions) - 1):
        gap = context.positions[i + 1].gap_to_leader - context.positions[i].gap_to_leader
        if 0 < gap < 2.0:
            a = context.positions[i].driver
            b = context.positions[i + 1].driver
            suggestions.append(f"Was the battle between {a} and {b} decided by pit strategy?")
            break

    # Multi-stop vs one-stop
    stints_by_driver = {}
    for s in context.stints:
        stints_by_driver.setdefault(s.driver, []).append(s)
    multi_stop = [d for d, ss in stints_by_driver.items() if len(ss) >= 3]
    if multi_stop:
        suggestions.append(f"Did {multi_stop[0]}'s multi-stop strategy work?")

    # Tyre strategy
    if context.stints:
        compounds_used = set(s.compound.value for s in context.stints)
        if len(compounds_used) >= 3:
            suggestions.append("Which tyre compound worked best in this race?")

    return suggestions[:4]
```

- [ ] **Step 2: Add frontend API function**

In `frontend/src/lib/api.ts`:

```typescript
export async function fetchSuggestions(sessionKey: string): Promise<string[]> {
  return fetchJSON<string[]>(`${BASE_URL}/data/suggestions?session_key=${sessionKey}`);
}
```

- [ ] **Step 3: Create SuggestedQuestions component**

```tsx
// frontend/src/components/SuggestedQuestions.tsx
import { motion } from "framer-motion";

type Props = {
  suggestions: string[];
  onSelect: (question: string) => void;
  loading: boolean;
};

export function SuggestedQuestions({ suggestions, onSelect, loading }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((q, i) => (
        <motion.button
          key={q}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(q)}
          disabled={loading}
          className="text-[11px] text-[var(--text-secondary)] bg-[var(--accent-bg)] border border-[var(--accent-bg-strong)] rounded-full px-3 py-1.5 hover:bg-[var(--accent-bg-strong)] transition-colors disabled:opacity-40"
        >
          {q}
        </motion.button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Integrate into RaceReviewView**

Fetch suggestions alongside race summary. Show them above the AnalysisBar when no analyses have been made yet.

```tsx
import { fetchSuggestions } from "../lib/api";
import { SuggestedQuestions } from "./SuggestedQuestions";

// Add state:
const [suggestions, setSuggestions] = useState<string[]>([]);

// In the session fetch effect:
fetchSuggestions(session.session_key)
  .then(setSuggestions)
  .catch(() => setSuggestions([]));

// In layout, before analysis cards:
{analyses.length === 0 && suggestions.length > 0 && (
  <SuggestedQuestions
    suggestions={suggestions}
    onSelect={handleAsk}
    loading={loading}
  />
)}
```

- [ ] **Step 5: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
cd ../backend && venv/bin/pytest tests/ -v
git add -A
git commit -m "feat: add smart suggested questions based on race data patterns"
```

---

## Chunk 5: Race Events Timeline

### Task 8: Fetch race control messages from OpenF1

**Files:**
- Modify: `backend/app/services/openf1.py`
- Modify: `backend/app/routers/data.py`
- Create: `frontend/src/components/RaceTimeline.tsx`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/RaceReviewView.tsx`

- [ ] **Step 1: Add fetch_race_control to openf1.py**

```python
async def fetch_race_control(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "race_control", {"session_key": session_key})
```

- [ ] **Step 2: Add race-events endpoint**

In `backend/app/routers/data.py`:

```python
@router.get("/data/race-events")
async def get_race_events(session_key: str):
    async with httpx.AsyncClient() as client:
        raw = await openf1.fetch_race_control(client, session_key)

    events = []
    for msg in raw:
        category = msg.get("category", "")
        # Filter to interesting events only
        if category in ("SafetyCar", "Flag", "Drs"):
            flag = msg.get("flag", "")
            message = msg.get("message", "")
            lap = msg.get("lap_number", 0)
            events.append({
                "lap": lap,
                "category": category,
                "flag": flag,
                "message": message,
            })

    return events
```

- [ ] **Step 3: Add types and API function in frontend**

In `frontend/src/lib/types.ts`:

```typescript
export type RaceEvent = {
  lap: number;
  category: string;
  flag: string;
  message: string;
};
```

In `frontend/src/lib/api.ts`:

```typescript
export async function fetchRaceEvents(sessionKey: string): Promise<RaceEvent[]> {
  return fetchJSON<RaceEvent[]>(`${BASE_URL}/data/race-events?session_key=${sessionKey}`);
}
```

- [ ] **Step 4: Create RaceTimeline component**

```tsx
// frontend/src/components/RaceTimeline.tsx
import { motion } from "framer-motion";
import type { RaceEvent } from "../lib/types";

type Props = {
  events: RaceEvent[];
  totalLaps: number;
};

const EVENT_COLORS: Record<string, string> = {
  SafetyCar: "bg-yellow-500",
  Flag: "bg-red-500",
  Drs: "bg-green-500",
};

const EVENT_LABELS: Record<string, string> = {
  SafetyCar: "SC",
  Flag: "FLAG",
  Drs: "DRS",
};

export function RaceTimeline({ events, totalLaps }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--accent-muted)] font-semibold">
          Race Events
        </h2>
      </div>

      {/* Timeline bar */}
      <div className="px-5 py-4">
        <div className="relative h-6 bg-[var(--bg-input)] rounded-full overflow-hidden">
          {events.map((event, i) => {
            const pct = (event.lap / Math.max(totalLaps, 1)) * 100;
            return (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`absolute top-0 h-full w-1 ${EVENT_COLORS[event.category] || "bg-neutral-500"} group`}
                style={{ left: `${pct}%` }}
              >
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap">
                  <div className="bg-[var(--bg-dropdown)] border border-[var(--border-strong)] rounded px-2 py-1 text-[9px] text-[var(--text-secondary)] shadow-lg">
                    L{event.lap}: {event.message || event.category}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Lap scale */}
        <div className="flex justify-between mt-1 text-[8px] text-[var(--text-muted)]">
          <span>L1</span>
          <span>L{Math.round(totalLaps / 2)}</span>
          <span>L{totalLaps}</span>
        </div>
      </div>

      {/* Event list */}
      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {events.slice(0, 8).map((event, i) => (
          <span
            key={i}
            className="text-[9px] text-[var(--text-secondary)] bg-[var(--bg-card-hover)] border border-[var(--border)] rounded px-2 py-0.5"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${EVENT_COLORS[event.category] || "bg-neutral-500"} mr-1`} />
            L{event.lap} {EVENT_LABELS[event.category] || event.category}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Integrate into RaceReviewView**

Fetch events alongside summary. Add after strategy map:

```tsx
import { RaceTimeline } from "./RaceTimeline";
import { fetchRaceEvents } from "../lib/api";
import type { RaceEvent } from "../lib/types";

// State:
const [events, setEvents] = useState<RaceEvent[]>([]);

// In fetch effect:
fetchRaceEvents(session.session_key)
  .then(setEvents)
  .catch(() => setEvents([]));

// In layout, after StrategyMap:
{events.length > 0 && (
  <RaceTimeline
    events={events}
    totalLaps={Math.max(...summary.laps.map((l) => l.lap_number), 0)}
  />
)}
```

- [ ] **Step 6: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
cd ../backend && venv/bin/pytest tests/ -v
git add -A
git commit -m "feat: add race events timeline with safety car, flag, DRS markers"
```

---

## Chunk 6: UX Polish — Skeletons, Mobile, Session Picker

### Task 9: Skeleton loading cards

**Files:**
- Create: `frontend/src/components/SkeletonCard.tsx`
- Modify: `frontend/src/components/RaceReviewView.tsx`

- [ ] **Step 1: Create SkeletonCard component**

```tsx
// frontend/src/components/SkeletonCard.tsx
type Props = {
  lines?: number;
  height?: string;
};

export function SkeletonCard({ lines = 4, height }: Props) {
  return (
    <div
      className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden animate-pulse"
      style={height ? { height } : undefined}
    >
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <div className="h-2.5 w-24 bg-[var(--border)] rounded" />
      </div>
      <div className="p-5 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-2 bg-[var(--border)] rounded"
            style={{ width: `${70 + Math.random() * 30}%` }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace spinner with skeleton layout in RaceReviewView**

Replace the fetching state:

```tsx
if (fetching) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <div className="h-5 w-48 bg-[var(--border)] rounded animate-pulse" />
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-4 max-w-6xl mx-auto">
          <SkeletonCard lines={8} height="350px" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <SkeletonCard lines={10} />
            </div>
            <div className="lg:col-span-3">
              <SkeletonCard lines={6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
git add -A
git commit -m "feat: add skeleton loading cards for race review"
```

---

### Task 10: Mobile responsive layout

**Files:**
- Modify: `frontend/src/components/RaceReviewView.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/StrategyMap.tsx`

- [ ] **Step 1: Make RaceReviewView layout stack on mobile**

The grid already uses `grid-cols-1 lg:grid-cols-5`. Add horizontal scroll to the strategy map on small screens:

In `StrategyMap.tsx`, wrap the driver rows in a scrollable container:

```tsx
// Change the outer p-4 div to:
<div className="p-4 flex flex-col gap-1.5 overflow-x-auto">
```

- [ ] **Step 2: Make header wrap on mobile**

In `RaceReviewView.tsx`, update the header:

```tsx
className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
```

- [ ] **Step 3: Make App header responsive**

In `App.tsx`, update the header to wrap on small screens:

```tsx
<header className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 gap-2 border-b border-[var(--border)]">
```

- [ ] **Step 4: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
git add -A
git commit -m "refactor: improve mobile responsive layout for race review"
```

---

### Task 11: Enriched session picker

**Files:**
- Modify: `frontend/src/components/SessionPicker.tsx`
- Modify: `backend/app/routers/data.py`

- [ ] **Step 1: Add winner to sessions endpoint**

In `backend/app/routers/data.py`, enrich the sessions list. Since fetching winners for all sessions would be expensive, just add the country flag emoji based on country_code:

The sessions already return `country`. We can show country flag. For winner data, it would require fetching each session's results which is too expensive. Instead, just improve the display with what we have.

- [ ] **Step 2: Improve SessionPicker styling**

In `frontend/src/components/SessionPicker.tsx`, update the dropdown items:

```tsx
// Replace the session row with:
<button
  key={s.session_key}
  onClick={() => { onSelect(s); setOpen(false); }}
  className={`w-full text-left px-4 py-2.5 hover:bg-[var(--bg-card-hover)] transition-colors ${
    selected?.session_key === s.session_key ? "bg-[var(--accent-bg)]" : ""
  }`}
>
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-[var(--text-primary)]">{s.location}</span>
    <span className="text-[10px] text-[var(--text-muted)] font-mono">{s.year}</span>
  </div>
  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
    {s.date} &middot; {s.country}
  </div>
</button>
```

- [ ] **Step 3: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
git add -A
git commit -m "refactor: enrich session picker with better layout and info"
```

---

## Execution Order

1. **Task 1** (recharts) — no dependencies
2. **Task 2** (caching) — no dependencies
3. **Task 3** (lap pace chart) — depends on Task 1
4. **Task 4** (pit markers) — no dependencies
5. **Task 5** (driver comparison) — depends on Task 1, 3 (laps in API)
6. **Task 6** (conversation memory) — no dependencies
7. **Task 7** (suggested questions) — no dependencies
8. **Task 8** (race events) — no dependencies
9. **Task 9** (skeletons) — no dependencies
10. **Task 10** (mobile) — no dependencies
11. **Task 11** (session picker) — no dependencies

Tasks 1+2, 4, 6, 7, 8, 9, 10, 11 can all run in parallel.
Tasks 3 and 5 must follow Task 1.

## Verification

After all tasks:

```bash
cd backend && venv/bin/pytest tests/ -v   # all tests pass
cd frontend && npx tsc --noEmit           # no type errors
cd frontend && npm run build              # production build succeeds
```

Then in the UI:
1. Select Melbourne 2026
2. Verify: strategy map with pit lap markers, lap pace chart, driver comparison, race timeline, sector breakdown, classification
3. Click a suggested question
4. Ask a follow-up question referencing the previous answer
5. Toggle dark/light mode
6. Check mobile layout (dev tools responsive mode)
