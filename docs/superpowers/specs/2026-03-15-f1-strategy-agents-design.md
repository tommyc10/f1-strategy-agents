# F1 Strategy Agents — Design Spec

## Overview

A multi-agent F1 strategy tool that answers race strategy questions using live and historical F1 data. Users interact via a chat interface styled like talking to a race engineer, with a live dashboard sidebar showing race context.

## Architecture

**Modular monolith** — single FastAPI app, each agent has its own router and module.

### Data Flow

```
User question → POST /orchestrator/query
  → POST /data/fetch        (Data Agent: OpenF1 API calls, pure Python)
  → POST /strategy/analyse  (Strategy Agent: Gemini LLM reasoning)
  → POST /summariser/brief  (Summariser Agent: template formatting, no LLM)
  → WebSocket streams response to frontend
```

Pipeline is strictly sequential: Data → Strategy → Summariser. No cross-agent calls or circular dependencies.

### Agents

**Data Agent** (`agents/data_agent.py`)
- Fetches and transforms race data from OpenF1 API
- Pure Python — no LLM calls, no business logic
- Returns typed Pydantic models, never raw JSON strings
- Handles missing/no-session scenarios gracefully (empty state, no exceptions)

**Strategy Agent** (`agents/strategy_agent.py`)
- Receives structured race data from Data Agent
- Calls Google Gemini with F1 chief strategist system prompt
- Reasons about: undercut/overcut windows, tyre degradation, track position, weather, safety car probability
- System prompt in `prompts/strategy_system.txt`
- Returns raw reasoning string with recommendation and confidence

**Summariser Agent** (`agents/summariser_agent.py`)
- Receives strategy reasoning string + race context
- Formats into 2-4 sentence radio-style briefing
- Pure Python template formatting (no LLM for now, can add later)
- Tone: calm, direct race engineer ("Box this lap. Mediums are gone.")
- System prompt in `prompts/summariser_system.txt` (for future LLM use)

**Orchestrator** (`routers/orchestrator.py`)
- Pure Python routing — no LLM
- Parses user question, enriches with session context
- Calls agents in sequence, handles errors for the full pipeline
- Returns structured response: `briefing`, `strategy_reasoning`, `race_context`

## Project Structure

```
f1-strategy-agents/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, WebSocket
│   │   ├── config.py            # env vars, API keys, settings
│   │   ├── routers/
│   │   │   ├── orchestrator.py  # POST /orchestrator/query
│   │   │   ├── data.py          # POST /data/fetch
│   │   │   ├── strategy.py      # POST /strategy/analyse
│   │   │   └── summariser.py    # POST /summariser/brief
│   │   ├── agents/
│   │   │   ├── data_agent.py    # pure functions: fetch & transform F1 data
│   │   │   ├── strategy_agent.py # calls Gemini with race context
│   │   │   └── summariser_agent.py # formats into radio-style briefing
│   │   ├── services/
│   │   │   ├── openf1.py        # OpenF1 API client (httpx)
│   │   │   └── gemini.py        # Google Gemini client wrapper
│   │   ├── models/
│   │   │   ├── schemas.py       # Pydantic request/response models
│   │   │   └── types.py         # shared TypedDicts / enums
│   │   └── prompts/
│   │       ├── strategy_system.txt
│   │       └── summariser_system.txt
│   ├── tests/
│   │   └── mock_data.py         # sample OpenF1 responses
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # layout shell, WebSocket connection
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── DashboardSidebar.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── PositionsCard.tsx
│   │   │   ├── TyresCard.tsx
│   │   │   └── WeatherCard.tsx
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts  # WebSocket connection + message handling
│   │   └── lib/
│   │       ├── api.ts           # REST API client functions
│   │       └── types.ts         # shared TypeScript types
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
├── CLAUDE.md
└── f1_agent_architecture.svg
```

## Tech Stack

### Backend
| Package | Purpose |
|---------|---------|
| `fastapi` | API framework |
| `uvicorn` | ASGI server |
| `httpx` | Async HTTP client (OpenF1 + Gemini) |
| `pydantic` | Request/response schemas |
| `python-dotenv` | Load `.env` for API keys |
| `google-genai` | Google Gemini SDK (free tier) |

### Frontend
| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `vite` | Build tool |
| `typescript` | Type safety |
| `tailwindcss` | Styling |
| `framer-motion` | Animations |
| `lucide-react` | Icons |

### External Services
- **OpenF1 API** — free, no auth, historical + live F1 data
- **Google Gemini 2.5 Flash** — free tier (15 RPM, 1M tokens/day)

### Not Using
- No database (stateless by design)
- No auth
- No Docker (for now)
- No ORM

## Frontend Design

### Layout
Chat + Dashboard Sidebar. Chat is the primary interaction (ask your engineer), sidebar shows live race context (positions, tyres, weather).

### Visual Theme: Glass & Depth
- **Background:** `#09090b` (near-black)
- **Cards:** `rgba(255,255,255,0.04)` with `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255,255,255,0.08)`, `box-shadow: 0 4px 24px rgba(0,0,0,0.3)`
- **Accent:** violet `rgb(139, 92, 246)` for highlights, labels, active states
- **Typography:** distinctive display font (not Inter/Roboto/Arial), monospace for race data
- **Motion:** Framer Motion for staggered message entrances, smooth panel transitions
- **Inspiration:** Apple/Arc browser — luxurious, layered, modern analytics tool feel
- **Anti-patterns:** No generic F1 red-and-black, no AI slop aesthetics

### Communication
- WebSocket for streaming agent responses to chat + live sidebar updates
- REST for initial data fetch

## Code Principles
- **Functional programming** — agents are pure functions, routers are thin HTTP wrappers
- **Minimal code** — no unnecessary abstractions, YAGNI
- **Clean code** — readable, well-structured, short functions (~40 lines max)
- **Async everywhere** — all I/O uses async/await
- **Prompts are code** — system prompts in `.txt` files, treated with same care as Python

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{"status": "ok"}` |
| `POST` | `/orchestrator/query` | Runs the full agent pipeline |
| `POST` | `/data/fetch` | Fetches race data from OpenF1 |
| `POST` | `/strategy/analyse` | Runs strategy reasoning via Gemini |
| `POST` | `/summariser/brief` | Formats strategy into radio briefing |
| `GET` | `/data/drivers` | Lists drivers in current/specified session |
| `WS` | `/ws` | WebSocket for streaming responses |

## API Contracts

### POST /orchestrator/query
```json
// Request
{ "question": "Should Norris pit now?", "session_key": "optional — latest session if omitted" }

// Response
{
  "briefing": "Box this lap. Mediums are gone...",
  "strategy_reasoning": "Full strategy agent output...",
  "race_context": { "positions": [...], "stints": [...], "weather": {...} }
}
```

### POST /data/fetch
```json
// Request
{ "session_key": "optional", "drivers": ["NOR", "VER"], "metrics": ["positions", "stints", "laps", "weather"] }

// Response — RaceContext
{
  "session_key": "9558",
  "positions": [{ "driver": "VER", "position": 1, "gap_to_leader": 0.0 }, ...],
  "stints": [{ "driver": "NOR", "compound": "MEDIUM", "tyre_age": 22, "stint_number": 2 }, ...],
  "laps": [{ "driver": "NOR", "lap_number": 34, "lap_time": 81.234 }, ...],
  "weather": { "track_temp": 42.0, "air_temp": 28.0, "rain_risk": 15 }
}
```

### POST /strategy/analyse
```json
// Request
{ "question": "Should Norris pit now?", "race_context": { ... } }

// Response
{ "reasoning": "Looking at the data...", "recommendation": "PIT", "confidence": "HIGH" }
```

### POST /summariser/brief
```json
// Request
{ "strategy_output": { "reasoning": "...", "recommendation": "PIT", "confidence": "HIGH" }, "race_context": { ... } }

// Response
{ "briefing": "Box this lap. Mediums degrading after 22 laps. Undercut window closes in 2 laps. Go go go." }
```

### WebSocket /ws
```json
// Client → Server
{ "type": "query", "question": "Should Norris pit now?", "session_key": "optional" }

// Server → Client: pipeline progress
{ "type": "status", "agent": "data", "state": "running" }
{ "type": "status", "agent": "data", "state": "complete" }
{ "type": "status", "agent": "strategy", "state": "running" }
// ... etc

// Server → Client: final result
{ "type": "result", "briefing": "...", "strategy_reasoning": "...", "race_context": { ... } }

// Server → Client: error
{ "type": "error", "message": "OpenF1 API unavailable" }
```

### GET /drivers
Owned by the data router. Returns drivers for a given session.
```json
// Response
{ "session_key": "9558", "drivers": [{ "driver_number": 4, "name": "Lando Norris", "code": "NOR", "team": "McLaren" }, ...] }
```

## Error Handling
- Wrap all OpenF1 calls in try/except — return clear error messages
- If no live session: return explanatory response, not an error
- Never expose raw exception tracebacks to the API consumer
- Orchestrator owns error handling for the full pipeline

## Testing
- `pytest` + `pytest-asyncio`
- Test each agent in isolation with mock data before wiring together
- `tests/mock_data.py` with sample OpenF1 responses for offline testing
- **Data agent tests:** verify OpenF1 responses are correctly transformed into Pydantic models, verify graceful empty state when no session exists
- **Strategy agent tests:** verify prompt is correctly constructed with race context, verify Gemini response is parsed into recommendation format
- **Summariser agent tests:** verify template produces 2-4 sentence briefing from strategy output
- **Orchestrator tests:** verify full pipeline runs in correct order, verify error in one agent returns clean error response
- Run: `pytest tests/ -v`
