# shadcn/ui Visual Overhaul — Design Spec

**Date:** 2026-03-16
**Status:** Draft

## Goal

Replace raw Tailwind markup with shadcn/ui components and restructure the race review layout into tabbed sections. Keep the glass-elevated visual identity (translucent backgrounds, backdrop blur, violet accent). Prioritize clean, minimal code throughout.

## Design Decisions

- **Direction:** Glass Elevated — shadcn component system with glassmorphism styling
- **Layout:** Tabbed sections (Overview, Pace, Sectors, Analysis)
- **Scope:** High-impact components only (Card, Button, Select, Tooltip, Skeleton, Tabs, Badge, ScrollArea)
- **Constraint:** Clean code always preferred — no unnecessary abstractions, minimal wrappers

## 1. shadcn/ui Initialization

### Config

Create `components.json` in `frontend/`:

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

### Path Aliases

**tsconfig.app.json** — add:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**vite.config.ts** — add resolve alias:
```ts
resolve: {
  alias: { "@": path.resolve(__dirname, "./src") }
}
```

### Utility

Create `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Components to Install

```
shadcn add card button select tooltip skeleton tabs badge scroll-area
```

This creates `src/components/ui/` with ~8 component files.

## 2. Theme Integration

Map shadcn's expected CSS variables to the existing glass theme in `index.css`. shadcn components will inherit the translucent look automatically.

```css
:root {
  /* Map shadcn variables to existing glass theme */
  --background: var(--bg-root);
  --foreground: var(--text-primary);
  --card: var(--bg-card);
  --card-foreground: var(--text-primary);
  --primary: var(--accent);
  --primary-foreground: #ffffff;
  --secondary: var(--bg-card-hover);
  --secondary-foreground: var(--text-secondary);
  --muted: var(--bg-card);
  --muted-foreground: var(--text-muted);
  --accent: var(--accent-bg);
  --accent-foreground: var(--text-primary);
  --border: var(--border);
  --input: var(--border);
  --ring: var(--accent);
  --radius: 0.75rem;
}
```

Light theme `[data-theme="light"]` gets equivalent mappings.

**Key:** shadcn Card component gets additional glass styling via the theme — `backdrop-filter: blur` and translucent backgrounds come from the CSS variable values, not per-component overrides.

## 3. Layout — Tabbed Race Review

### Structure

```
RaceReviewView
├── Header (session name, date, weather)
├── Tabs
│   ├── Overview tab
│   │   ├── Card > StrategyMap
│   │   ├── Card > RaceTimeline
│   │   └── Grid: Card > ResultsTable + Card > (summary stats)
│   ├── Pace tab
│   │   ├── Card > LapPaceChart (full width)
│   │   └── Card > DriverComparison (full width)
│   ├── Sectors tab
│   │   └── Card > SectorBreakdown (expanded, more drivers)
│   └── Analysis tab
│       ├── SuggestedQuestions
│       └── AnalysisCard list
├── AnalysisBar (sticky bottom, visible on all tabs)
```

### Tab behavior

- Default tab: Overview
- Tab content fills viewport: `flex-1 overflow-y-auto`
- Analysis input bar fixed below tabs on all tab views
- Mobile: tabs become horizontally scrollable
- Tab state resets on session change

## 4. Component Replacements

### SessionPicker → shadcn Select

Replace raw `<select>` with shadcn `Select` + `SelectTrigger` + `SelectContent` + `SelectItem`. Glass-styled dropdown via theme variables.

### Tooltip replacements

Replace all custom `group-hover` tooltip divs in StrategyMap and RaceTimeline with shadcn `Tooltip` + `TooltipTrigger` + `TooltipContent`. Removes ~20 lines of custom tooltip markup per component.

### Card wrappers

Every data panel currently repeats:
```tsx
className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden"
```

Replace with shadcn `Card` which inherits these styles from theme variables. Each domain component gets wrapped in `Card` + `CardHeader` + `CardContent`.

### SkeletonCard → shadcn Skeleton

Replace custom SkeletonCard with composable `Skeleton` primitives. Instead of one monolithic skeleton component, each tab gets inline skeleton layout matching its actual content structure.

### Buttons

Replace raw `<button>` elements with shadcn `Button`:
- AnalysisBar submit → `Button` default variant
- SuggestedQuestions pills → `Button variant="outline" size="sm"`
- Driver toggles in LapPaceChart → `Button variant="ghost" size="sm"` with active state
- ResultsTable "Show more" → `Button variant="ghost"`

### Badge

Tyre compound labels in StrategyMap tooltips and ResultsTable → shadcn `Badge` with custom compound color variants (soft=red, medium=yellow, hard=gray).

### ScrollArea

ResultsTable (20 drivers) and StrategyMap (20 rows) → shadcn `ScrollArea` for consistent cross-browser scrollbar styling.

## 5. Components That Stay Custom

These F1-domain components keep their rendering logic unchanged. They get wrapped in shadcn Card but their internals are custom:

- **StrategyMap** — stint bars with compound colors, proportional widths
- **LapPaceChart** — recharts LineChart with driver toggles
- **DriverComparison** — recharts cumulative gap chart
- **RaceTimeline** — horizontal event marker bar
- **SectorBreakdown** — delta-colored sector time bars

## 6. File Changes

### New files
- `src/components/ui/card.tsx` (shadcn)
- `src/components/ui/button.tsx` (shadcn)
- `src/components/ui/select.tsx` (shadcn)
- `src/components/ui/tooltip.tsx` (shadcn)
- `src/components/ui/skeleton.tsx` (shadcn)
- `src/components/ui/tabs.tsx` (shadcn)
- `src/components/ui/badge.tsx` (shadcn)
- `src/components/ui/scroll-area.tsx` (shadcn)
- `src/lib/utils.ts` — `cn()` utility
- `components.json` — shadcn config

### Modified files
- `index.css` — add shadcn variable mappings
- `tsconfig.app.json` — add path alias
- `vite.config.ts` — add resolve alias
- `RaceReviewView.tsx` — tabbed layout rewrite (largest change)
- `SessionPicker.tsx` — shadcn Select
- `StrategyMap.tsx` — shadcn Tooltip + Card wrap
- `RaceTimeline.tsx` — shadcn Tooltip + Card wrap
- `AnalysisBar.tsx` — shadcn Button
- `SuggestedQuestions.tsx` — shadcn Button
- `SkeletonCard.tsx` — remove (replaced by inline Skeleton usage)
- `LapPaceChart.tsx` — shadcn Card + Button toggles
- `DriverComparison.tsx` — shadcn Card + Select
- `ResultsTable.tsx` — shadcn Card + Badge + ScrollArea
- `SectorBreakdown.tsx` — shadcn Card

### Deleted files
- `src/components/SkeletonCard.tsx` — replaced by shadcn Skeleton composables

## 7. Code Quality Principles

- Remove repeated glassmorphism class strings — Card component handles this via theme
- No wrapper components around shadcn primitives unless adding real logic
- Prefer shadcn's built-in variant system over custom className conditionals
- Keep domain components focused — Card wrapping happens in the parent (RaceReviewView), not inside each component
- Delete dead code immediately, no backwards-compat shims

## 8. Out of Scope

- Backend changes (none needed)
- New features or data endpoints
- Chat panel redesign (live mode unchanged)
- Mobile-specific layout beyond tab scrollability
- Dark/light theme redesign (existing theme stays, just mapped to shadcn vars)
