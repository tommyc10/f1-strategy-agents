# CLAUDE.md — F1 Strategy Agents

This file tells Claude Code how to work with this codebase. Read it before making any changes.

---

## Core priorities

1. **Correctness over cleverness** — simple, readable Python beats clever one-liners
2. **Async everywhere** — all I/O (API calls, HTTP requests) must be async/await
3. **Agents stay focused** — each agent does one thing; no logic bleeds between them
4. **Fail gracefully** — never let an external API failure crash the whole pipeline
5. **Prompts are code** — treat system prompts with the same care as Python functions
6. **Functional programming** — pure functions, minimal state, no classes unless necessary
7. **Minimal code** — no unnecessary abstractions, YAGNI ruthlessly

---

## Architecture

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
├── frontend/                    # React + TypeScript + Tailwind + Framer Motion
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
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

**Modular monolith** — single FastAPI app, each agent has its own router + module. Not microservices, but cleanly separated as if they could be.

Data flow is strictly linear:

```
User question → orchestrator → data agent → strategy agent → summariser agent → response
```

Do not add cross-agent calls or circular dependencies.

---

## Code style

### Python (backend)
- `async def` for any function that does I/O
- Use `httpx.AsyncClient` for all HTTP requests
- Pydantic models for all request/response schemas
- No print statements — use Python `logging`
- Keep functions short: ~40 lines max, split if longer
- Functional style: pure functions, avoid classes where a function suffices
- Clean, simple, readable, minimal code

### TypeScript (frontend)
- React with TypeScript, Tailwind CSS, Framer Motion
- Functional components only
- Reference `.agents/skills/vercel-react-best-practices/` for performance patterns
- Reference `.agents/skills/frontend-design/SKILL.md` for design quality guidelines

---

## Agents — rules

**Data agent** (`data_agent.py`)
- Only responsibility: fetch and return structured race data from OpenF1
- Pure Python — no LLM calls, no business logic
- Returns Pydantic models, never raw JSON strings
- Must handle no-session scenarios gracefully (return empty state, don't raise)
- All OpenF1 calls go through `services/openf1.py`

**Strategy agent** (`strategy_agent.py`)
- Receives structured race data from Data Agent
- Calls Google Gemini (free tier) with F1 strategist system prompt
- Injects data into prompt — never pass raw user input directly to the LLM
- System prompt lives in `prompts/strategy_system.txt`, loaded at startup
- Returns reasoning string with recommendation and confidence

**Summariser agent** (`summariser_agent.py`)
- Receives the strategy reasoning string + race context
- Returns a short, punchy race-engineer-style briefing (2–4 sentences max)
- Currently pure Python template formatting — no LLM
- System prompt in `prompts/summariser_system.txt` (for future LLM use)

**Orchestrator** (`routers/orchestrator.py`)
- Pure Python — no LLM calls
- Calls the three agents in order: data → strategy → summariser
- Owns error handling for the full pipeline
- Returns structured response: `briefing`, `strategy_reasoning`, `race_context`

---

## Tech stack

### Backend
- **FastAPI** + **uvicorn** — API framework
- **httpx** — async HTTP client (OpenF1 + Gemini)
- **pydantic** — schemas
- **python-dotenv** — env vars
- **google-genai** — Gemini SDK (free tier: 15 RPM, 1M tokens/day)

### Frontend
- **React** + **TypeScript** — UI framework
- **Vite** — build tool
- **Tailwind CSS** — styling
- **Framer Motion** — animations
- **Lucide React** — icons

### External services
- **OpenF1 API** — free, no auth, historical + live F1 data
- **Google Gemini 2.5 Flash** — free tier LLM

---

## Frontend design

**Visual theme: Glass & Depth**
- Background: `#09090b`, cards with glassmorphism (`backdrop-filter: blur`, subtle borders)
- Accent: violet `rgb(139, 92, 246)`
- Typography: distinctive fonts (never Inter/Roboto/Arial)
- No generic F1 red-and-black clichés. No AI slop aesthetics.
- Inspiration: Apple/Arc — luxurious, layered, modern

**Layout:** Chat interface (primary) + dashboard sidebar (positions, tyres, weather)

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{"status": "ok"}` |
| POST | `/orchestrator/query` | Runs the full agent pipeline |
| POST | `/data/fetch` | Fetches race data from OpenF1 |
| POST | `/strategy/analyse` | Runs strategy reasoning via Gemini |
| POST | `/summariser/brief` | Formats strategy into radio briefing |
| GET | `/drivers` | Lists drivers in current session |
| WS | `/ws` | WebSocket for streaming responses |

---

## Error handling

- Wrap all OpenF1 calls in try/except — return clear error messages
- If no live session: return explanatory response, not an error
- Never expose raw exception tracebacks to the API consumer
- Orchestrator owns error handling for the full pipeline

---

## Testing

- `pytest` + `pytest-asyncio` for async tests
- Test each agent in isolation with mock data before wiring together
- `tests/mock_data.py` with sample OpenF1 responses for offline testing
- Run: `pytest tests/ -v`

---

## What not to do

- Do not add a database — this project is stateless by design
- Do not call OpenF1 directly from agents — always go through `services/openf1.py`
- Do not put secrets in Python files — use `.env`
- Do not add synchronous blocking calls inside async functions
- Do not modify the orchestrator's agent order without updating this file
- Do not use Inter, Roboto, Arial, or system fonts in the frontend
- Do not use generic red/black F1 colour schemes
