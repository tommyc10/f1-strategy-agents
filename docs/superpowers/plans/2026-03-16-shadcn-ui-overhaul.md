# shadcn/ui Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw Tailwind markup with shadcn/ui components and restructure the race review into a tabbed layout, keeping the glass-elevated visual identity.

**Architecture:** Initialize shadcn/ui with Tailwind v4's `@theme inline` directives so components resolve utility classes correctly. Rename existing `--accent` and `--border` CSS vars to avoid collision with shadcn's expected names. Refactor RaceReviewView into 4 tab sub-components. Replace generic UI primitives with shadcn components; keep F1 domain components custom.

**Tech Stack:** React 19, Tailwind CSS v4, shadcn/ui v4, Radix UI, Vite 7, recharts, Framer Motion

---

## Chunk 1: Foundation

### Task 1: Add path aliases and cn() utility

**Files:**
- Modify: `frontend/tsconfig.app.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/lib/utils.ts`

- [ ] **Step 1: Add path alias to tsconfig.app.json**

Add `baseUrl` and `paths` to `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Keep all existing options. Just add these two fields.

- [ ] **Step 2: Add resolve alias to vite.config.ts**

Add `path` import and `resolve.alias`:

```ts
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 3: Install clsx and tailwind-merge**

```bash
cd frontend && npm install clsx tailwind-merge
```

- [ ] **Step 4: Create cn() utility**

Create `frontend/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: passes with no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/tsconfig.app.json frontend/vite.config.ts frontend/src/lib/utils.ts frontend/package.json frontend/package-lock.json
git commit -m "chore: add path aliases and cn() utility for shadcn"
```

---

### Task 2: Rename colliding CSS variables

**Files:**
- Modify: `frontend/src/index.css`
- Modify (find-and-replace): all `.tsx` files referencing `var(--accent)` and `var(--border)`

The existing `--accent` and `--border` CSS variables collide with names shadcn expects to own. Rename them to `--f1-accent` and `--f1-border` (and related variants) so shadcn's theme layer can claim `--accent` and `--border`.

- [ ] **Step 1: Rename CSS variables in index.css**

In `:root` block, rename:
- `--accent` → `--f1-accent`
- `--accent-muted` → `--f1-accent-muted`
- `--accent-bg` → `--f1-accent-bg`
- `--accent-bg-strong` → `--f1-accent-bg-strong`
- `--border` → `--f1-border`
- `--border-strong` → `--f1-border-strong`
- `--border-error` → `--f1-border-error`

Do the same in `[data-theme="light"]` block.

- [ ] **Step 2: Find-and-replace in all component files**

Search all `.tsx` and `.css` files for the old variable names and replace with the new `--f1-` prefixed names. This includes:
- `var(--accent)` → `var(--f1-accent)`
- `var(--accent-muted)` → `var(--f1-accent-muted)`
- `var(--accent-bg)` → `var(--f1-accent-bg)`
- `var(--accent-bg-strong)` → `var(--f1-accent-bg-strong)`
- `var(--border)` → `var(--f1-border)`
- `var(--border-strong)` → `var(--f1-border-strong)`
- `var(--border-error)` → `var(--f1-border-error)`

Files to update (all in `frontend/src/components/`):
- `RaceReviewView.tsx`, `StrategyMap.tsx`, `LapPaceChart.tsx`, `DriverComparison.tsx`
- `RaceTimeline.tsx`, `SectorBreakdown.tsx`, `ResultsTable.tsx`, `SessionPicker.tsx`
- `AnalysisBar.tsx`, `AnalysisCard.tsx`, `SuggestedQuestions.tsx`, `SkeletonCard.tsx`
- `ChatPanel.tsx`, `MessageBubble.tsx`, `DashboardSidebar.tsx`, `WeatherCard.tsx`
- `TyresCard.tsx`, `PositionsCard.tsx`, `ThemeToggle.tsx`
- `frontend/src/App.tsx`

- [ ] **Step 3: Verify nothing is visually broken**

```bash
cd frontend && npx tsc --noEmit && npx vite build
```

Expected: compiles and builds clean. The app looks identical since the values haven't changed, only the names.

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src
git commit -m "refactor: rename CSS vars to avoid shadcn collision (--accent → --f1-accent, --border → --f1-border)"
```

---

### Task 3: Add shadcn theme layer and install components

**Files:**
- Modify: `frontend/src/index.css`
- Create: `frontend/components.json`
- Create: `frontend/src/components/ui/*.tsx` (via shadcn CLI)

- [ ] **Step 1: Create components.json**

Create `frontend/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 2: Add shadcn theme variables to index.css**

Add after the existing `:root` block, using Tailwind v4's `@theme inline` directive so Tailwind generates utility classes (`bg-card`, `text-primary`, etc.):

```css
@theme inline {
  --color-background: var(--bg-root);
  --color-foreground: var(--text-primary);
  --color-card: var(--bg-card);
  --color-card-foreground: var(--text-primary);
  --color-primary: var(--f1-accent);
  --color-primary-foreground: #ffffff;
  --color-secondary: var(--bg-card-hover);
  --color-secondary-foreground: var(--text-secondary);
  --color-muted: var(--bg-card);
  --color-muted-foreground: var(--text-muted);
  --color-accent: var(--f1-accent-bg);
  --color-accent-foreground: var(--text-primary);
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-border: var(--f1-border);
  --color-input: var(--f1-border);
  --color-ring: var(--f1-accent);
  --color-popover: var(--bg-dropdown);
  --color-popover-foreground: var(--text-primary);
  --radius: 0.75rem;
}
```

- [ ] **Step 3: Install shadcn components**

```bash
cd frontend && npx shadcn@latest add card button select tooltip skeleton tabs badge scroll-area
```

This creates `src/components/ui/` with the 8 component files and installs Radix UI dependencies automatically.

- [ ] **Step 4: Verify everything compiles**

```bash
cd frontend && npx tsc --noEmit && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/components.json frontend/src/components/ui/ frontend/src/index.css frontend/package.json frontend/package-lock.json
git commit -m "feat: initialize shadcn/ui with glass theme and install core components"
```

---

## Chunk 2: Component Migration

### Task 4: Migrate SessionPicker to shadcn Select

**Files:**
- Modify: `frontend/src/components/SessionPicker.tsx`

Replace the custom dropdown (Framer Motion `AnimatePresence` + absolute positioned menu) with shadcn `Select`. Keep the `fetchSessions` data-loading logic and two-line item display.

- [ ] **Step 1: Rewrite SessionPicker**

```tsx
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchSessions } from "@/lib/api";
import type { Session } from "@/lib/types";

type Props = {
  selected: Session | null;
  onSelect: (session: Session) => void;
};

export function SessionPicker({ selected, onSelect }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Select
      value={selected?.session_key ?? ""}
      onValueChange={(key) => {
        const s = sessions.find((s) => s.session_key === key);
        if (s) onSelect(s);
      }}
    >
      <SelectTrigger className="w-56 bg-card/50 backdrop-blur-xl border-border text-sm">
        <SelectValue placeholder={loading ? "Loading..." : "Select a race..."} />
      </SelectTrigger>
      <SelectContent className="bg-popover/95 backdrop-blur-xl border-border">
        {sessions.map((s) => (
          <SelectItem key={s.session_key} value={s.session_key}>
            <span className="font-medium">{s.location}</span>
            <span className="text-muted-foreground text-[10px] ml-2">{s.date} · {s.country}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SessionPicker.tsx
git commit -m "refactor: migrate SessionPicker to shadcn Select"
```

---

### Task 5: Migrate AnalysisBar and SuggestedQuestions to shadcn Button

**Files:**
- Modify: `frontend/src/components/AnalysisBar.tsx`
- Modify: `frontend/src/components/SuggestedQuestions.tsx`

- [ ] **Step 1: Update AnalysisBar**

Replace the raw submit button with shadcn `Button` size="icon":

```tsx
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onAsk: (question: string) => void;
  loading: boolean;
  sessionLabel: string;
};

export function AnalysisBar({ onAsk, loading, sessionLabel }: Props) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onAsk(input.trim());
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border px-6 py-3">
      <div className="flex items-center gap-3 bg-card/50 backdrop-blur-xl border border-border rounded-full px-4 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Analyse ${sessionLabel}... e.g. "When should Hamilton have pitted?"`}
          disabled={loading}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <Button type="submit" size="icon" variant="ghost" disabled={loading || !input.trim()} className="rounded-full h-8 w-8 text-primary hover:bg-primary/20">
          <Send size={14} />
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Update SuggestedQuestions**

```tsx
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

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
        <motion.div
          key={q}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(q)}
            disabled={loading}
            className="text-[11px] rounded-full border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {q}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/AnalysisBar.tsx frontend/src/components/SuggestedQuestions.tsx
git commit -m "refactor: migrate AnalysisBar and SuggestedQuestions to shadcn Button"
```

---

### Task 6: Migrate ResultsTable to shadcn Card + Button + ScrollArea

**Files:**
- Modify: `frontend/src/components/ResultsTable.tsx`

- [ ] **Step 1: Rewrite ResultsTable**

```tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Position = {
  driver: string;
  position: number;
  gap_to_leader: number;
};

const COLLAPSED_COUNT = 10;

export function ResultsTable({ positions }: { positions: Position[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? positions : positions.slice(0, COLLAPSED_COUNT);
  const canExpand = positions.length > COLLAPSED_COUNT;

  return (
    <Card className="backdrop-blur-xl h-full flex flex-col">
      <CardHeader className="px-5 py-3">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--f1-accent-muted)] font-semibold">
          Classification
        </h2>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          <div className="divide-y divide-border">
            {visible.map((p, i) => (
              <motion.div
                key={p.driver}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`flex items-center px-5 py-2 text-sm ${
                  p.position <= 3 ? "bg-[var(--bg-highlight)]" : ""
                }`}
              >
                <span
                  className={`w-8 text-xs font-mono ${
                    p.position === 1
                      ? "text-yellow-500"
                      : p.position === 2
                        ? "text-muted-foreground"
                        : p.position === 3
                          ? "text-amber-600"
                          : "text-muted-foreground"
                  }`}
                >
                  P{p.position}
                </span>
                <span className="flex-1 text-foreground font-medium text-[13px]">{p.driver}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {p.position === 1 ? "LEADER" : `+${p.gap_to_leader.toFixed(1)}s`}
                </span>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      {canExpand && (
        <div className="border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            {expanded ? "Show less" : `+${positions.length - COLLAPSED_COUNT} more`}
            <ChevronDown size={10} className={`ml-1 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ResultsTable.tsx
git commit -m "refactor: migrate ResultsTable to shadcn Card, Button, ScrollArea"
```

---

### Task 7: Migrate StrategyMap to shadcn Tooltip + Card

**Files:**
- Modify: `frontend/src/components/StrategyMap.tsx`

Replace the custom `group-hover` tooltip divs with shadcn `Tooltip`. Wrap in shadcn `Card`. Keep all stint bar rendering logic unchanged.

- [ ] **Step 1: Rewrite StrategyMap**

Replace the outer div with `Card`/`CardHeader`/`CardContent`. Replace each stint's `group-hover` tooltip div with `Tooltip`/`TooltipTrigger`/`TooltipContent` from shadcn. Import `TooltipProvider` and wrap the whole component.

Key changes:
- Outer container: `<Card className="backdrop-blur-xl">`
- Header: `<CardHeader>` with the existing title + compound legend
- Content: `<CardContent>` wrapping the driver rows
- Each stint bar: wrap in `<Tooltip>` with `<TooltipTrigger asChild>` on the bar div, `<TooltipContent>` for the hover info
- Remove all `group` and `group-hover:block` classes
- Keep all Framer Motion, compound colors, pit markers

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/StrategyMap.tsx
git commit -m "refactor: migrate StrategyMap to shadcn Card and Tooltip"
```

---

### Task 8: Migrate RaceTimeline to shadcn Tooltip + Card

**Files:**
- Modify: `frontend/src/components/RaceTimeline.tsx`

Same pattern as StrategyMap — replace `group-hover` tooltips with shadcn `Tooltip`, wrap in `Card`.

- [ ] **Step 1: Rewrite RaceTimeline**

Replace outer div with `Card`/`CardHeader`/`CardContent`. Replace each event marker's hover tooltip with shadcn `Tooltip`. Remove `group`/`group-hover` classes.

- [ ] **Step 2: Verify TypeScript compiles and commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/RaceTimeline.tsx
git commit -m "refactor: migrate RaceTimeline to shadcn Card and Tooltip"
```

---

### Task 9: Migrate LapPaceChart and DriverComparison to shadcn Card + Button/Select

**Files:**
- Modify: `frontend/src/components/LapPaceChart.tsx`
- Modify: `frontend/src/components/DriverComparison.tsx`

- [ ] **Step 1: Update LapPaceChart**

- Wrap in `Card`/`CardHeader`/`CardContent`
- Replace driver toggle buttons with shadcn `Button variant="ghost" size="sm"`
- Use `cn()` for active state styling
- Keep recharts rendering unchanged

- [ ] **Step 2: Update DriverComparison**

- Wrap in `Card`/`CardHeader`/`CardContent`
- Replace raw `<select>` elements with shadcn `Select`
- Keep recharts rendering unchanged

- [ ] **Step 3: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/LapPaceChart.tsx frontend/src/components/DriverComparison.tsx
git commit -m "refactor: migrate LapPaceChart and DriverComparison to shadcn components"
```

---

### Task 10: Migrate SectorBreakdown and AnalysisCard to shadcn Card

**Files:**
- Modify: `frontend/src/components/SectorBreakdown.tsx`
- Modify: `frontend/src/components/AnalysisCard.tsx`

- [ ] **Step 1: Update SectorBreakdown**

Replace outer container with `Card`/`CardHeader`/`CardContent`. Keep all sector bar rendering and delta coloring logic unchanged.

- [ ] **Step 2: Update AnalysisCard**

Replace outer `motion.div` with `motion.create(Card)` or wrap Card in motion.div. Replace glassmorphism classes with Card component. Keep the accent bar and paragraph rendering.

- [ ] **Step 3: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/SectorBreakdown.tsx frontend/src/components/AnalysisCard.tsx
git commit -m "refactor: migrate SectorBreakdown and AnalysisCard to shadcn Card"
```

---

## Chunk 3: Tabbed Layout

### Task 11: Create tab sub-components and rewrite RaceReviewView

**Files:**
- Create: `frontend/src/components/tabs/OverviewTab.tsx`
- Create: `frontend/src/components/tabs/PaceTab.tsx`
- Create: `frontend/src/components/tabs/SectorsTab.tsx`
- Create: `frontend/src/components/tabs/AnalysisTab.tsx`
- Modify: `frontend/src/components/RaceReviewView.tsx`
- Delete: `frontend/src/components/SkeletonCard.tsx`

- [ ] **Step 1: Create OverviewTab**

Create `frontend/src/components/tabs/OverviewTab.tsx`:

```tsx
import { StrategyMap } from "@/components/StrategyMap";
import { RaceTimeline } from "@/components/RaceTimeline";
import { ResultsTable } from "@/components/ResultsTable";
import type { RaceSummary, RaceEvent } from "@/lib/api";

type Props = {
  summary: RaceSummary;
  raceEvents: RaceEvent[];
  totalLaps: number;
};

export function OverviewTab({ summary, raceEvents, totalLaps }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <StrategyMap strategyMap={summary.strategy_map} />
      <RaceTimeline events={raceEvents} totalLaps={totalLaps} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <ResultsTable positions={summary.positions} />
        </div>
        <div className="lg:col-span-3">
          {/* Summary stats placeholder — classification already covers this */}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PaceTab**

Create `frontend/src/components/tabs/PaceTab.tsx`:

```tsx
import { LapPaceChart } from "@/components/LapPaceChart";
import { DriverComparison } from "@/components/DriverComparison";
import { Skeleton } from "@/components/ui/skeleton";
import type { RaceSummary } from "@/lib/api";

type Props = {
  summary: RaceSummary;
};

export function PaceTab({ summary }: Props) {
  if (!summary.laps || summary.laps.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] rounded-2xl" />
        <Skeleton className="h-[240px] rounded-2xl" />
      </div>
    );
  }

  const drivers = summary.positions.map((p) => p.driver);

  return (
    <div className="flex flex-col gap-4">
      <LapPaceChart laps={summary.laps} drivers={drivers.slice(0, 10)} />
      <DriverComparison laps={summary.laps} positions={summary.positions} />
    </div>
  );
}
```

- [ ] **Step 3: Create SectorsTab**

Create `frontend/src/components/tabs/SectorsTab.tsx`:

```tsx
import { SectorBreakdown } from "@/components/SectorBreakdown";
import type { RaceSummary } from "@/lib/api";

type Props = {
  summary: RaceSummary;
};

export function SectorsTab({ summary }: Props) {
  const drivers = summary.positions.map((p) => p.driver);

  if (!summary.sectors || summary.sectors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">No sector data available</p>
      </div>
    );
  }

  return <SectorBreakdown sectors={summary.sectors} drivers={drivers.slice(0, 10)} />;
}
```

- [ ] **Step 4: Create AnalysisTab**

Create `frontend/src/components/tabs/AnalysisTab.tsx`:

```tsx
import { Loader2 } from "lucide-react";
import { SuggestedQuestions } from "@/components/SuggestedQuestions";
import { AnalysisCard } from "@/components/AnalysisCard";

type Analysis = { id: string; question: string; answer: string };

type Props = {
  suggestions: string[];
  analyses: Analysis[];
  loading: boolean;
  pendingQuestion: string | null;
  onAsk: (question: string) => void;
};

export function AnalysisTab({ suggestions, analyses, loading, pendingQuestion, onAsk }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {suggestions.length > 0 && analyses.length === 0 && (
        <div className="py-2">
          <p className="text-[10px] uppercase tracking-[2px] text-[var(--f1-accent-muted)] font-semibold mb-3">
            Suggested questions
          </p>
          <SuggestedQuestions suggestions={suggestions} onSelect={onAsk} loading={loading} />
        </div>
      )}

      {analyses.map((a) => (
        <AnalysisCard key={a.id} question={a.question} answer={a.answer} />
      ))}

      {loading && pendingQuestion && (
        <div className="flex items-center gap-2 text-xs text-[var(--f1-accent-muted)] animate-pulse">
          <Loader2 size={12} className="animate-spin" />
          <span className="uppercase tracking-widest">Analysing...</span>
        </div>
      )}

      {analyses.length === 0 && suggestions.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">Ask a question to get started</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Rewrite RaceReviewView with shadcn Tabs**

Rewrite `frontend/src/components/RaceReviewView.tsx`:

```tsx
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

      {/* Tabs */}
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
```

- [ ] **Step 6: Delete SkeletonCard.tsx**

```bash
rm frontend/src/components/SkeletonCard.tsx
```

Remove any remaining imports of `SkeletonCard` from other files (should be none after RaceReviewView rewrite).

- [ ] **Step 7: Verify TypeScript compiles and build succeeds**

```bash
cd frontend && npx tsc --noEmit && npx vite build
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/tabs/ frontend/src/components/RaceReviewView.tsx
git rm frontend/src/components/SkeletonCard.tsx
git commit -m "feat: restructure race review into tabbed layout with shadcn Tabs"
```

---

## Chunk 4: Final Cleanup

### Task 12: Update import paths to use @ alias across all modified files

**Files:**
- Modify: all component files to use `@/` imports instead of relative `../` paths

- [ ] **Step 1: Update imports**

In every file that was modified in Tasks 4-11, replace relative imports with `@/` aliases:
- `"../lib/api"` → `"@/lib/api"`
- `"../lib/types"` → `"@/lib/types"`
- `"../hooks/useWebSocket"` → `"@/hooks/useWebSocket"`
- `"./ComponentName"` → `"@/components/ComponentName"` (only in App.tsx and RaceReviewView)

Leave intra-directory relative imports as-is (e.g., components importing from `./SubComponent` when in the same folder).

- [ ] **Step 2: Full build verification**

```bash
cd frontend && npx tsc --noEmit && npx vite build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src
git commit -m "refactor: standardize imports to @/ path aliases"
```

---

### Task 13: Final verification and cleanup

- [ ] **Step 1: Run full TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 2: Run production build**

```bash
cd frontend && npx vite build
```

- [ ] **Step 3: Run backend tests to ensure nothing broke**

```bash
cd backend && ./venv/bin/pytest tests/ -v
```

- [ ] **Step 4: Manual visual check**

Start dev servers and visually verify:
- Session picker opens and selects correctly
- All 4 tabs display their content
- Tooltips work on strategy map and race timeline
- Charts render in Pace tab
- Analysis flow works (ask question → auto-switch to Analysis tab)
- Light/dark theme toggle works

- [ ] **Step 5: Final commit**

```bash
git add -A frontend/src
git commit -m "feat: complete shadcn/ui visual overhaul with tabbed layout"
```
