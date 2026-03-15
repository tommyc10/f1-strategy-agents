# F1 Strategy Agents

AI-powered Formula 1 race strategy analysis. Ask questions about upcoming races, and get real-time tactical briefings powered by live F1 data and LLM reasoning.

## What it does

- **Data Agent**: Fetches live session data from OpenF1 (drivers, positions, tyres, weather)
- **Strategy Agent**: Analyzes race context with Claude/Gemini to generate tactical predictions
- **Summariser Agent**: Formats strategy insights into punchy race-engineer-style briefings

## Quick start

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Server runs at `http://localhost:8000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

## Architecture

- **Backend**: FastAPI + async agents for data fetching, LLM reasoning, and summarization
- **Frontend**: React + TypeScript + Tailwind CSS with WebSocket for live updates
- **External APIs**: OpenF1 (F1 data), Google Gemini (LLM strategy analysis)

See [CLAUDE.md](CLAUDE.md) for detailed development guidelines.

## Endpoints

- `POST /orchestrator/query` — Full agent pipeline (data → strategy → briefing)
- `POST /data/fetch` — Raw F1 session data
- `POST /strategy/analyse` — Strategy reasoning via LLM
- `POST /summariser/brief` — Formatted race briefing
- `WS /ws` — WebSocket for streaming responses

## Requirements

- Python 3.10+
- Node.js 18+
- `.env` file with `GEMINI_API_KEY`
