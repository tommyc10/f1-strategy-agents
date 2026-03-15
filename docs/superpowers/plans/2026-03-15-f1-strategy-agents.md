# F1 Strategy Agents Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-agent F1 strategy tool with FastAPI backend and React frontend that answers race strategy questions using OpenF1 data and Google Gemini.

**Architecture:** Modular monolith — single FastAPI app with 4 agent routers (orchestrator, data, strategy, summariser). Sequential pipeline: Data → Strategy → Summariser. React + TypeScript frontend with Glass & Depth visual theme, chat interface + dashboard sidebar. WebSocket for streaming responses.

**Tech Stack:** Python 3.12, FastAPI, httpx, Pydantic, google-genai, React 18, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-15-f1-strategy-agents-design.md`

---

## Chunk 1: Project Setup & Foundation

### Task 1: Initialise git and project skeleton

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `backend/pyproject.toml`
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/agents/__init__.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/prompts/` (directory)
- Create: `backend/tests/__init__.py`

- [ ] **Step 1: Initialise git repo**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents
git init
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
# Python
__pycache__/
*.pyc
.venv/
*.egg-info/
dist/

# Environment
.env

# Node
node_modules/
dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store

# Project
.superpowers/
```

- [ ] **Step 3: Create `.env.example`**

```
GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 4: Create `backend/pyproject.toml`**

```toml
[project]
name = "f1-strategy-agents"
version = "0.1.0"
description = "F1 race strategy agent pipeline"
requires-python = ">=3.12"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 5: Create `backend/requirements.txt`**

```
fastapi>=0.115.0
uvicorn>=0.34.0
httpx>=0.28.0
pydantic>=2.10.0
pydantic-settings>=2.7.0
python-dotenv>=1.0.0
google-genai>=1.0.0
pytest>=8.0.0
pytest-asyncio>=0.25.0
```

- [ ] **Step 6: Create Python virtual environment and install dependencies**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

- [ ] **Step 7: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    gemini_api_key: str = ""
    openf1_base_url: str = "https://api.openf1.org/v1"
    gemini_model: str = "gemini-2.5-flash"

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 8: Create `backend/app/main.py`**

```python
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="F1 Strategy Agents", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 9: Create empty `__init__.py` files**

Create empty `__init__.py` in: `backend/app/`, `backend/app/routers/`, `backend/app/agents/`, `backend/app/services/`, `backend/app/models/`, `backend/tests/`

Create empty `backend/app/prompts/` directory.

- [ ] **Step 10: Verify server starts**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Expected: Server starts, `GET http://localhost:8000/health` returns `{"status": "ok"}`

- [ ] **Step 11: Commit**

```bash
git add .gitignore .env.example backend/ CLAUDE.md f1_agent_architecture.svg docs/
git commit -m "feat: project skeleton — FastAPI app with health endpoint"
```

---

### Task 2: Pydantic models and shared types

**Files:**
- Create: `backend/app/models/types.py`
- Create: `backend/app/models/schemas.py`

- [ ] **Step 1: Create `backend/app/models/types.py`**

Shared enums and lightweight types used across agents.

```python
from enum import StrEnum


class TyreCompound(StrEnum):
    SOFT = "SOFT"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    INTERMEDIATE = "INTERMEDIATE"
    WET = "WET"


class Recommendation(StrEnum):
    PIT = "PIT"
    STAY_OUT = "STAY_OUT"
    OPPOSITE = "OPPOSITE"
    FLEXIBLE = "FLEXIBLE"


class Confidence(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
```

- [ ] **Step 2: Create `backend/app/models/schemas.py`**

All Pydantic request/response models per the API contracts in the spec.

```python
from pydantic import BaseModel
from app.models.types import TyreCompound, Recommendation, Confidence


# --- Data Agent ---

class DriverPosition(BaseModel):
    driver: str
    position: int
    gap_to_leader: float


class TyreStint(BaseModel):
    driver: str
    compound: TyreCompound
    tyre_age: int
    stint_number: int


class LapTime(BaseModel):
    driver: str
    lap_number: int
    lap_time: float


class Weather(BaseModel):
    track_temp: float
    air_temp: float
    rain_risk: int


class RaceContext(BaseModel):
    session_key: str
    positions: list[DriverPosition]
    stints: list[TyreStint]
    laps: list[LapTime]
    weather: Weather | None


class DataFetchRequest(BaseModel):
    session_key: str | None = None
    drivers: list[str] | None = None
    metrics: list[str] | None = None


class DataFetchResponse(BaseModel):
    race_context: RaceContext


# --- Strategy Agent ---

class StrategyRequest(BaseModel):
    question: str
    race_context: RaceContext


class StrategyOutput(BaseModel):
    reasoning: str
    recommendation: Recommendation
    confidence: Confidence


class StrategyResponse(BaseModel):
    strategy_output: StrategyOutput


# --- Summariser Agent ---

class SummariserRequest(BaseModel):
    strategy_output: StrategyOutput
    race_context: RaceContext


class SummariserResponse(BaseModel):
    briefing: str


# --- Orchestrator ---

class OrchestratorRequest(BaseModel):
    question: str
    session_key: str | None = None


class OrchestratorResponse(BaseModel):
    briefing: str
    strategy_reasoning: str
    race_context: RaceContext


# --- Drivers ---

class Driver(BaseModel):
    driver_number: int
    name: str
    code: str
    team: str


class DriversResponse(BaseModel):
    session_key: str
    drivers: list[Driver]
```

- [ ] **Step 3: Verify models parse correctly**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/backend
source .venv/bin/activate
python -c "from app.models.schemas import *; from app.models.types import *; print('Models OK')"
```

Expected: `Models OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/
git commit -m "feat: add Pydantic models and shared types for all agent contracts"
```

---

### Task 3: OpenF1 API client

**Files:**
- Create: `backend/app/services/openf1.py`
- Create: `backend/tests/test_openf1.py`
- Create: `backend/tests/mock_data.py`

- [ ] **Step 1: Create `backend/tests/mock_data.py`**

Sample OpenF1 API responses for offline testing.

```python
"""Sample OpenF1 API responses for offline testing."""

MOCK_SESSION = {
    "session_key": 9558,
    "session_name": "Race",
    "session_type": "Race",
    "date_start": "2024-03-02T15:00:00",
    "circuit_short_name": "Bahrain",
}

MOCK_POSITIONS = [
    {"driver_number": 1, "position": 1, "date": "2024-03-02T15:30:00"},
    {"driver_number": 4, "position": 2, "date": "2024-03-02T15:30:00"},
    {"driver_number": 16, "position": 3, "date": "2024-03-02T15:30:00"},
]

MOCK_DRIVERS = [
    {"driver_number": 1, "full_name": "Max Verstappen", "name_acronym": "VER", "team_name": "Red Bull Racing"},
    {"driver_number": 4, "full_name": "Lando Norris", "name_acronym": "NOR", "team_name": "McLaren"},
    {"driver_number": 16, "full_name": "Charles Leclerc", "name_acronym": "LEC", "team_name": "Ferrari"},
]

MOCK_STINTS = [
    {"driver_number": 1, "compound": "SOFT", "tyre_age_at_start": 0, "lap_start": 1, "lap_end": 18, "stint_number": 1},
    {"driver_number": 4, "compound": "MEDIUM", "tyre_age_at_start": 0, "lap_start": 1, "lap_end": 22, "stint_number": 1},
    {"driver_number": 4, "compound": "MEDIUM", "tyre_age_at_start": 0, "lap_start": 1, "lap_end": None, "stint_number": 2},
]

MOCK_LAPS = [
    {"driver_number": 4, "lap_number": 33, "lap_duration": 81.234},
    {"driver_number": 4, "lap_number": 34, "lap_duration": 81.567},
    {"driver_number": 1, "lap_number": 34, "lap_duration": 80.890},
]

MOCK_WEATHER = [
    {"air_temperature": 28.0, "track_temperature": 42.0, "rainfall": 0, "date": "2024-03-02T15:30:00"},
]

MOCK_INTERVALS = [
    {"driver_number": 1, "gap_to_leader": 0.0, "interval": 0.0},
    {"driver_number": 4, "gap_to_leader": 1.2, "interval": 1.2},
    {"driver_number": 16, "gap_to_leader": 3.4, "interval": 2.2},
]
```

- [ ] **Step 2: Write failing test for OpenF1 client**

Create `backend/tests/test_openf1.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from app.services.openf1 import fetch_positions, fetch_drivers, fetch_stints, fetch_laps, fetch_weather, fetch_intervals, fetch_latest_session
from tests.mock_data import (
    MOCK_SESSION, MOCK_POSITIONS, MOCK_DRIVERS, MOCK_STINTS,
    MOCK_LAPS, MOCK_WEATHER, MOCK_INTERVALS,
)


@pytest.fixture
def mock_client():
    client = AsyncMock()
    return client


async def test_fetch_latest_session(mock_client):
    mock_client.get.return_value = AsyncMock(
        status_code=200,
        json=lambda: [MOCK_SESSION],
    )
    result = await fetch_latest_session(mock_client)
    assert result["session_key"] == 9558


async def test_fetch_positions(mock_client):
    mock_client.get.return_value = AsyncMock(
        status_code=200,
        json=lambda: MOCK_POSITIONS,
    )
    result = await fetch_positions(mock_client, session_key="9558")
    assert len(result) == 3
    assert result[0]["position"] == 1


async def test_fetch_drivers(mock_client):
    mock_client.get.return_value = AsyncMock(
        status_code=200,
        json=lambda: MOCK_DRIVERS,
    )
    result = await fetch_drivers(mock_client, session_key="9558")
    assert len(result) == 3
    assert result[1]["name_acronym"] == "NOR"


async def test_fetch_returns_empty_on_error(mock_client):
    mock_client.get.return_value = AsyncMock(status_code=500, json=lambda: {})
    result = await fetch_positions(mock_client, session_key="9558")
    assert result == []
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/backend
source .venv/bin/activate
pytest tests/test_openf1.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.openf1'`

- [ ] **Step 4: Implement `backend/app/services/openf1.py`**

```python
import logging
from httpx import AsyncClient
from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = settings.openf1_base_url


async def _get(client: AsyncClient, endpoint: str, params: dict | None = None) -> list:
    try:
        response = await client.get(f"{BASE_URL}/{endpoint}", params=params or {})
        if response.status_code != 200:
            logger.warning("OpenF1 %s returned %d", endpoint, response.status_code)
            return []
        return response.json()
    except Exception as e:
        logger.error("OpenF1 %s failed: %s", endpoint, e)
        return []


async def fetch_latest_session(client: AsyncClient) -> dict | None:
    results = await _get(client, "sessions", {"session_type": "Race"})
    return results[-1] if results else None


async def fetch_positions(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "position", {"session_key": session_key})


async def fetch_drivers(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "drivers", {"session_key": session_key})


async def fetch_stints(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "stints", {"session_key": session_key})


async def fetch_laps(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "laps", {"session_key": session_key})


async def fetch_weather(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "weather", {"session_key": session_key})


async def fetch_intervals(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "intervals", {"session_key": session_key})
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_openf1.py -v
```

Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/openf1.py backend/tests/mock_data.py backend/tests/test_openf1.py
git commit -m "feat: OpenF1 API client with async httpx and error handling"
```

---

### Task 4: Gemini client wrapper

**Files:**
- Create: `backend/app/services/gemini.py`
- Create: `backend/tests/test_gemini.py`

- [ ] **Step 1: Write failing test for Gemini client**

Create `backend/tests/test_gemini.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.gemini import generate_strategy


async def test_generate_strategy_returns_text():
    mock_response = MagicMock()
    mock_response.text = "Based on the data, Norris should pit now."

    with patch("app.services.gemini.client") as mock_client:
        mock_client.models.generate_content_async = AsyncMock(return_value=mock_response)
        result = await generate_strategy(
            system_prompt="You are an F1 strategist.",
            user_message="Should Norris pit?",
        )
        assert result == "Based on the data, Norris should pit now."


async def test_generate_strategy_returns_empty_on_error():
    with patch("app.services.gemini.client") as mock_client:
        mock_client.models.generate_content_async = AsyncMock(side_effect=Exception("API error"))
        result = await generate_strategy(
            system_prompt="You are an F1 strategist.",
            user_message="Should Norris pit?",
        )
        assert result == ""
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_gemini.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `backend/app/services/gemini.py`**

```python
import logging
from google import genai
from app.config import settings

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.gemini_api_key)


async def generate_strategy(system_prompt: str, user_message: str) -> str:
    try:
        response = await client.models.generate_content_async(
            model=settings.gemini_model,
            contents=user_message,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                max_output_tokens=1024,
            ),
        )
        return response.text or ""
    except Exception as e:
        logger.error("Gemini call failed: %s", e)
        return ""
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_gemini.py -v
```

Expected: All 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/gemini.py backend/tests/test_gemini.py
git commit -m "feat: Gemini client wrapper with async generation and error handling"
```

---

## Chunk 2: Agent Pipeline

### Task 5: Data agent

**Files:**
- Create: `backend/app/agents/data_agent.py`
- Create: `backend/tests/test_data_agent.py`

- [ ] **Step 1: Write failing test for data agent**

Create `backend/tests/test_data_agent.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from app.agents.data_agent import fetch_race_context
from app.models.schemas import RaceContext
from tests.mock_data import (
    MOCK_SESSION, MOCK_POSITIONS, MOCK_DRIVERS, MOCK_STINTS,
    MOCK_LAPS, MOCK_WEATHER, MOCK_INTERVALS,
)


def _mock_openf1(**overrides):
    defaults = {
        "fetch_latest_session": AsyncMock(return_value=MOCK_SESSION),
        "fetch_positions": AsyncMock(return_value=MOCK_POSITIONS),
        "fetch_drivers": AsyncMock(return_value=MOCK_DRIVERS),
        "fetch_stints": AsyncMock(return_value=MOCK_STINTS),
        "fetch_laps": AsyncMock(return_value=MOCK_LAPS),
        "fetch_weather": AsyncMock(return_value=MOCK_WEATHER),
        "fetch_intervals": AsyncMock(return_value=MOCK_INTERVALS),
    }
    defaults.update(overrides)
    return defaults


@patch("app.agents.data_agent.openf1")
async def test_fetch_race_context_returns_typed_model(mock_openf1_module):
    for name, mock_fn in _mock_openf1().items():
        setattr(mock_openf1_module, name, mock_fn)

    result = await fetch_race_context(session_key=None, drivers=None)
    assert isinstance(result, RaceContext)
    assert result.session_key == "9558"
    assert len(result.positions) == 3
    assert result.positions[0].driver == "VER"


@patch("app.agents.data_agent.openf1")
async def test_fetch_race_context_handles_no_session(mock_openf1_module):
    for name, mock_fn in _mock_openf1(fetch_latest_session=AsyncMock(return_value=None)).items():
        setattr(mock_openf1_module, name, mock_fn)

    result = await fetch_race_context(session_key=None, drivers=None)
    assert isinstance(result, RaceContext)
    assert result.positions == []
    assert result.stints == []


@patch("app.agents.data_agent.openf1")
async def test_fetch_race_context_filters_by_driver(mock_openf1_module):
    for name, mock_fn in _mock_openf1().items():
        setattr(mock_openf1_module, name, mock_fn)

    result = await fetch_race_context(session_key="9558", drivers=["NOR"])
    nor_positions = [p for p in result.positions if p.driver == "NOR"]
    assert len(nor_positions) >= 1
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_data_agent.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `backend/app/agents/data_agent.py`**

```python
import logging
import httpx
from app.services import openf1
from app.models.schemas import (
    RaceContext, DriverPosition, TyreStint, LapTime, Weather,
)
from app.models.types import TyreCompound

logger = logging.getLogger(__name__)


def _build_driver_lookup(raw_drivers: list) -> dict[int, str]:
    return {d["driver_number"]: d["name_acronym"] for d in raw_drivers}


def _parse_positions(raw_positions: list, raw_intervals: list, driver_lookup: dict[int, str]) -> list[DriverPosition]:
    gap_map = {item["driver_number"]: item.get("gap_to_leader", 0.0) for item in raw_intervals}
    seen = set()
    positions = []
    for p in sorted(raw_positions, key=lambda x: x["position"]):
        num = p["driver_number"]
        if num in seen or num not in driver_lookup:
            continue
        seen.add(num)
        positions.append(DriverPosition(
            driver=driver_lookup[num],
            position=p["position"],
            gap_to_leader=gap_map.get(num, 0.0),
        ))
    return positions


def _parse_stints(raw_stints: list, driver_lookup: dict[int, str]) -> list[TyreStint]:
    stints = []
    for s in raw_stints:
        num = s["driver_number"]
        if num not in driver_lookup:
            continue
        compound = s.get("compound", "UNKNOWN")
        if compound not in TyreCompound.__members__:
            continue
        lap_end = s.get("lap_end") or s.get("lap_start", 0)
        lap_start = s.get("lap_start", 0)
        stints.append(TyreStint(
            driver=driver_lookup[num],
            compound=TyreCompound(compound),
            tyre_age=lap_end - lap_start,
            stint_number=s.get("stint_number", 1),
        ))
    return stints


def _parse_laps(raw_laps: list, driver_lookup: dict[int, str]) -> list[LapTime]:
    laps = []
    for lap in raw_laps:
        num = lap["driver_number"]
        if num not in driver_lookup or lap.get("lap_duration") is None:
            continue
        laps.append(LapTime(
            driver=driver_lookup[num],
            lap_number=lap["lap_number"],
            lap_time=lap["lap_duration"],
        ))
    return laps


def _parse_weather(raw_weather: list) -> Weather | None:
    if not raw_weather:
        return None
    w = raw_weather[-1]
    return Weather(
        track_temp=w.get("track_temperature", 0.0),
        air_temp=w.get("air_temperature", 0.0),
        rain_risk=int(w.get("rainfall", 0) > 0) * 100,
    )


def _empty_context() -> RaceContext:
    return RaceContext(
        session_key="",
        positions=[],
        stints=[],
        laps=[],
        weather=None,
    )


async def fetch_race_context(
    session_key: str | None = None,
    drivers: list[str] | None = None,
) -> RaceContext:
    async with httpx.AsyncClient() as client:
        if not session_key:
            session = await openf1.fetch_latest_session(client)
            if not session:
                return _empty_context()
            session_key = str(session["session_key"])

        raw_drivers = await openf1.fetch_drivers(client, session_key)
        driver_lookup = _build_driver_lookup(raw_drivers)

        if drivers:
            driver_codes = set(drivers)
            driver_lookup = {k: v for k, v in driver_lookup.items() if v in driver_codes}

        raw_positions = await openf1.fetch_positions(client, session_key)
        raw_intervals = await openf1.fetch_intervals(client, session_key)
        raw_stints = await openf1.fetch_stints(client, session_key)
        raw_laps = await openf1.fetch_laps(client, session_key)
        raw_weather = await openf1.fetch_weather(client, session_key)

        return RaceContext(
            session_key=session_key,
            positions=_parse_positions(raw_positions, raw_intervals, driver_lookup),
            stints=_parse_stints(raw_stints, driver_lookup),
            laps=_parse_laps(raw_laps, driver_lookup),
            weather=_parse_weather(raw_weather),
        )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_data_agent.py -v
```

Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/agents/data_agent.py backend/tests/test_data_agent.py
git commit -m "feat: data agent — fetches and transforms OpenF1 data into typed models"
```

---

### Task 6: Strategy agent + system prompt

**Files:**
- Create: `backend/app/prompts/strategy_system.txt`
- Create: `backend/app/agents/strategy_agent.py`
- Create: `backend/tests/test_strategy_agent.py`

- [ ] **Step 1: Create `backend/app/prompts/strategy_system.txt`**

```text
You are a Formula 1 chief strategist with decades of experience across multiple championship-winning teams.

You will receive structured race data and a question from the pit wall. Analyse the data and provide a clear strategy recommendation.

## Your Analysis Must Consider
- Tyre degradation: compound age, performance drop-off, remaining life
- Track position: gaps to cars ahead and behind, undercut/overcut windows
- Pit window: is the undercut or overcut viable given current gaps?
- Weather: rain probability, temperature changes affecting tyre performance
- Race pace: lap time trends, who is faster on current tyres
- Safety car probability: based on race situation

## Response Format
Provide your analysis in this exact format:

REASONING: [Your detailed analysis of the situation, referencing specific data points — lap times, gaps, tyre ages. Be specific with numbers.]

RECOMMENDATION: [Exactly one of: PIT, STAY_OUT, OPPOSITE, FLEXIBLE]

CONFIDENCE: [Exactly one of: HIGH, MEDIUM, LOW]

## Rules
- Always reference the actual numbers from the data provided
- Never fabricate data that was not given to you
- If data is insufficient, say so and set confidence to LOW
- Be decisive — the team needs a clear call, not a maybe
- Think like you're making a call that could win or lose the race
```

- [ ] **Step 2: Write failing test for strategy agent**

Create `backend/tests/test_strategy_agent.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from app.agents.strategy_agent import analyse_strategy
from app.models.schemas import RaceContext, DriverPosition, TyreStint, Weather, StrategyOutput
from app.models.types import TyreCompound, Recommendation, Confidence


def _sample_context() -> RaceContext:
    return RaceContext(
        session_key="9558",
        positions=[
            DriverPosition(driver="VER", position=1, gap_to_leader=0.0),
            DriverPosition(driver="NOR", position=2, gap_to_leader=1.2),
        ],
        stints=[
            TyreStint(driver="NOR", compound=TyreCompound.MEDIUM, tyre_age=22, stint_number=1),
        ],
        laps=[],
        weather=Weather(track_temp=42.0, air_temp=28.0, rain_risk=15),
    )


@patch("app.agents.strategy_agent.generate_strategy")
async def test_analyse_strategy_parses_response(mock_generate):
    mock_generate.return_value = (
        "REASONING: Norris is on old mediums. Gap is tight.\n\n"
        "RECOMMENDATION: PIT\n\n"
        "CONFIDENCE: HIGH"
    )
    result = await analyse_strategy("Should Norris pit?", _sample_context())
    assert isinstance(result, StrategyOutput)
    assert result.recommendation == Recommendation.PIT
    assert result.confidence == Confidence.HIGH
    assert "old mediums" in result.reasoning


@patch("app.agents.strategy_agent.generate_strategy")
async def test_analyse_strategy_handles_unparseable_response(mock_generate):
    mock_generate.return_value = "I think he should probably pit maybe."
    result = await analyse_strategy("Should Norris pit?", _sample_context())
    assert isinstance(result, StrategyOutput)
    assert result.confidence == Confidence.LOW


@patch("app.agents.strategy_agent.generate_strategy")
async def test_analyse_strategy_handles_empty_response(mock_generate):
    mock_generate.return_value = ""
    result = await analyse_strategy("Should Norris pit?", _sample_context())
    assert isinstance(result, StrategyOutput)
    assert result.reasoning != ""
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pytest tests/test_strategy_agent.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement `backend/app/agents/strategy_agent.py`**

```python
import logging
import re
from pathlib import Path
from app.services.gemini import generate_strategy
from app.models.schemas import RaceContext, StrategyOutput
from app.models.types import Recommendation, Confidence

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "strategy_system.txt"
SYSTEM_PROMPT = PROMPT_PATH.read_text()


def _format_race_context(context: RaceContext) -> str:
    lines = [f"Session: {context.session_key}"]

    if context.positions:
        lines.append("\nPositions:")
        for p in context.positions:
            lines.append(f"  P{p.position} {p.driver} — gap to leader: {p.gap_to_leader}s")

    if context.stints:
        lines.append("\nTyre Stints:")
        for s in context.stints:
            lines.append(f"  {s.driver} — {s.compound.value} compound, {s.tyre_age} laps old (stint {s.stint_number})")

    if context.laps:
        lines.append("\nRecent Laps:")
        for lap in context.laps[-10:]:
            lines.append(f"  {lap.driver} lap {lap.lap_number}: {lap.lap_time:.3f}s")

    if context.weather:
        w = context.weather
        lines.append(f"\nWeather: track {w.track_temp}°C, air {w.air_temp}°C, rain risk {w.rain_risk}%")

    return "\n".join(lines)


def _parse_response(raw: str) -> StrategyOutput:
    reasoning_match = re.search(r"REASONING:\s*(.+?)(?=\nRECOMMENDATION:|\Z)", raw, re.DOTALL)
    recommendation_match = re.search(r"RECOMMENDATION:\s*(\w+)", raw)
    confidence_match = re.search(r"CONFIDENCE:\s*(\w+)", raw)

    reasoning = reasoning_match.group(1).strip() if reasoning_match else raw.strip() or "Unable to analyse — insufficient data."

    try:
        recommendation = Recommendation(recommendation_match.group(1).upper()) if recommendation_match else Recommendation.FLEXIBLE
    except ValueError:
        recommendation = Recommendation.FLEXIBLE

    try:
        confidence = Confidence(confidence_match.group(1).upper()) if confidence_match else Confidence.LOW
    except ValueError:
        confidence = Confidence.LOW

    return StrategyOutput(
        reasoning=reasoning,
        recommendation=recommendation,
        confidence=confidence,
    )


async def analyse_strategy(question: str, race_context: RaceContext) -> StrategyOutput:
    context_text = _format_race_context(race_context)
    user_message = f"Race Data:\n{context_text}\n\nQuestion: {question}"

    raw_response = await generate_strategy(SYSTEM_PROMPT, user_message)

    if not raw_response:
        return StrategyOutput(
            reasoning="Strategy analysis unavailable — LLM returned no response.",
            recommendation=Recommendation.FLEXIBLE,
            confidence=Confidence.LOW,
        )

    return _parse_response(raw_response)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_strategy_agent.py -v
```

Expected: All 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/prompts/strategy_system.txt backend/app/agents/strategy_agent.py backend/tests/test_strategy_agent.py
git commit -m "feat: strategy agent — Gemini-powered F1 strategist with prompt parsing"
```

---

### Task 7: Summariser agent

**Files:**
- Create: `backend/app/prompts/summariser_system.txt`
- Create: `backend/app/agents/summariser_agent.py`
- Create: `backend/tests/test_summariser_agent.py`

- [ ] **Step 1: Create `backend/app/prompts/summariser_system.txt`**

```text
You are an F1 race engineer speaking on team radio. Convert strategy analysis into a brief, direct radio message.

Tone: calm, confident, no filler words. Like speaking to your driver mid-race.
Length: 2-4 sentences maximum.
Style: "Box this lap. Mediums are done. Undercut window closes in two laps."

Do not say "I think" or "maybe". Be decisive. Use short sentences.
```

- [ ] **Step 2: Write failing test for summariser agent**

Create `backend/tests/test_summariser_agent.py`:

```python
import pytest
from app.agents.summariser_agent import create_briefing
from app.models.schemas import StrategyOutput, RaceContext, DriverPosition, TyreStint, Weather
from app.models.types import Recommendation, Confidence, TyreCompound


def _sample_strategy_output() -> StrategyOutput:
    return StrategyOutput(
        reasoning="Norris is on 22-lap old mediums. Gap to Verstappen is 1.2s. Undercut window is open.",
        recommendation=Recommendation.PIT,
        confidence=Confidence.HIGH,
    )


def _sample_context() -> RaceContext:
    return RaceContext(
        session_key="9558",
        positions=[DriverPosition(driver="NOR", position=2, gap_to_leader=1.2)],
        stints=[TyreStint(driver="NOR", compound=TyreCompound.MEDIUM, tyre_age=22, stint_number=1)],
        laps=[],
        weather=Weather(track_temp=42.0, air_temp=28.0, rain_risk=15),
    )


async def test_create_briefing_returns_string():
    result = await create_briefing(_sample_strategy_output(), _sample_context())
    assert isinstance(result, str)
    assert len(result) > 0


async def test_create_briefing_is_concise():
    result = await create_briefing(_sample_strategy_output(), _sample_context())
    sentences = [s.strip() for s in result.split(".") if s.strip()]
    assert len(sentences) <= 5


async def test_create_briefing_mentions_recommendation():
    result = await create_briefing(_sample_strategy_output(), _sample_context())
    result_lower = result.lower()
    assert "pit" in result_lower or "box" in result_lower


async def test_create_briefing_handles_stay_out():
    strategy = StrategyOutput(
        reasoning="Tyres are fine. Gap is comfortable.",
        recommendation=Recommendation.STAY_OUT,
        confidence=Confidence.HIGH,
    )
    result = await create_briefing(strategy, _sample_context())
    result_lower = result.lower()
    assert "stay out" in result_lower or "hold position" in result_lower or "push" in result_lower
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pytest tests/test_summariser_agent.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement `backend/app/agents/summariser_agent.py`**

```python
import logging
from app.models.schemas import StrategyOutput, RaceContext
from app.models.types import Recommendation, Confidence

logger = logging.getLogger(__name__)

TEMPLATES = {
    Recommendation.PIT: "Box box box. {tyre_detail}{gap_detail}",
    Recommendation.STAY_OUT: "Stay out, stay out. {tyre_detail}{gap_detail}",
    Recommendation.OPPOSITE: "We're going opposite strategy. {tyre_detail}{gap_detail}",
    Recommendation.FLEXIBLE: "Standby, we're looking at options. {tyre_detail}{gap_detail}",
}

CONFIDENCE_SUFFIX = {
    Confidence.HIGH: "High confidence on this call.",
    Confidence.MEDIUM: "Moderate confidence — monitor the situation.",
    Confidence.LOW: "Low confidence — be ready to adapt.",
}


def _tyre_detail(context: RaceContext) -> str:
    if not context.stints:
        return ""
    latest = context.stints[-1]
    return f"{latest.compound.value.capitalize()}s on {latest.tyre_age} laps. "


def _gap_detail(context: RaceContext) -> str:
    if len(context.positions) < 2:
        return ""
    gap = context.positions[0].gap_to_leader
    if gap == 0.0 and len(context.positions) > 1:
        gap = context.positions[1].gap_to_leader
    if gap > 0:
        return f"Gap is {gap:.1f}s. "
    return ""


async def create_briefing(strategy: StrategyOutput, context: RaceContext) -> str:
    template = TEMPLATES.get(strategy.recommendation, TEMPLATES[Recommendation.FLEXIBLE])
    tyre = _tyre_detail(context)
    gap = _gap_detail(context)

    briefing = template.format(tyre_detail=tyre, gap_detail=gap)
    briefing += CONFIDENCE_SUFFIX[strategy.confidence]

    return briefing.strip()
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_summariser_agent.py -v
```

Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/prompts/summariser_system.txt backend/app/agents/summariser_agent.py backend/tests/test_summariser_agent.py
git commit -m "feat: summariser agent — template-based radio-style briefings"
```

---

### Task 8: Agent routers

**Files:**
- Create: `backend/app/routers/data.py`
- Create: `backend/app/routers/strategy.py`
- Create: `backend/app/routers/summariser.py`

- [ ] **Step 1: Create `backend/app/routers/data.py`**

```python
from fastapi import APIRouter
from app.models.schemas import DataFetchRequest, DataFetchResponse, DriversResponse, Driver
from app.agents.data_agent import fetch_race_context
from app.services import openf1
import httpx

router = APIRouter(prefix="/data", tags=["data"])


@router.post("/fetch", response_model=DataFetchResponse)
async def fetch_data(request: DataFetchRequest):
    context = await fetch_race_context(
        session_key=request.session_key,
        drivers=request.drivers,
    )
    return DataFetchResponse(race_context=context)


@router.get("/drivers", response_model=DriversResponse)
async def get_drivers(session_key: str | None = None):
    async with httpx.AsyncClient() as client:
        if not session_key:
            session = await openf1.fetch_latest_session(client)
            if not session:
                return DriversResponse(session_key="", drivers=[])
            session_key = str(session["session_key"])

        raw_drivers = await openf1.fetch_drivers(client, session_key)

    drivers = [
        Driver(
            driver_number=d["driver_number"],
            name=d.get("full_name", ""),
            code=d.get("name_acronym", ""),
            team=d.get("team_name", ""),
        )
        for d in raw_drivers
    ]
    return DriversResponse(session_key=session_key, drivers=drivers)
```

- [ ] **Step 2: Create `backend/app/routers/strategy.py`**

```python
from fastapi import APIRouter
from app.models.schemas import StrategyRequest, StrategyResponse
from app.agents.strategy_agent import analyse_strategy

router = APIRouter(prefix="/strategy", tags=["strategy"])


@router.post("/analyse", response_model=StrategyResponse)
async def analyse(request: StrategyRequest):
    result = await analyse_strategy(request.question, request.race_context)
    return StrategyResponse(strategy_output=result)
```

- [ ] **Step 3: Create `backend/app/routers/summariser.py`**

```python
from fastapi import APIRouter
from app.models.schemas import SummariserRequest, SummariserResponse
from app.agents.summariser_agent import create_briefing

router = APIRouter(prefix="/summariser", tags=["summariser"])


@router.post("/brief", response_model=SummariserResponse)
async def brief(request: SummariserRequest):
    result = await create_briefing(request.strategy_output, request.race_context)
    return SummariserResponse(briefing=result)
```

- [ ] **Step 4: Register routers in `backend/app/main.py`**

Add after the CORS middleware:

```python
from app.routers import data, strategy, summariser

app.include_router(data.router)
app.include_router(strategy.router)
app.include_router(summariser.router)
```

- [ ] **Step 5: Verify server starts with all routes**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Then check `http://localhost:8000/docs` — should show all endpoints.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/ backend/app/main.py
git commit -m "feat: add data, strategy, and summariser routers"
```

---

## Chunk 3: Orchestrator & WebSocket

### Task 9: Orchestrator agent + router

**Files:**
- Create: `backend/app/routers/orchestrator.py`
- Create: `backend/tests/test_orchestrator.py`

- [ ] **Step 1: Write failing test for orchestrator**

Create `backend/tests/test_orchestrator.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from app.routers.orchestrator import run_pipeline
from app.models.schemas import (
    OrchestratorRequest, OrchestratorResponse, RaceContext,
    DriverPosition, TyreStint, Weather, StrategyOutput,
)
from app.models.types import TyreCompound, Recommendation, Confidence


def _mock_context():
    return RaceContext(
        session_key="9558",
        positions=[DriverPosition(driver="NOR", position=2, gap_to_leader=1.2)],
        stints=[TyreStint(driver="NOR", compound=TyreCompound.MEDIUM, tyre_age=22, stint_number=1)],
        laps=[],
        weather=Weather(track_temp=42.0, air_temp=28.0, rain_risk=15),
    )


def _mock_strategy():
    return StrategyOutput(
        reasoning="Norris should pit. Mediums are degrading.",
        recommendation=Recommendation.PIT,
        confidence=Confidence.HIGH,
    )


@patch("app.routers.orchestrator.create_briefing")
@patch("app.routers.orchestrator.analyse_strategy")
@patch("app.routers.orchestrator.fetch_race_context")
async def test_pipeline_runs_in_order(mock_data, mock_strategy, mock_summariser):
    mock_data.return_value = _mock_context()
    mock_strategy.return_value = _mock_strategy()
    mock_summariser.return_value = "Box box box. Mediums on 22 laps."

    result = await run_pipeline("Should Norris pit?", session_key=None)
    assert isinstance(result, OrchestratorResponse)
    assert result.briefing == "Box box box. Mediums on 22 laps."
    assert "Norris should pit" in result.strategy_reasoning

    mock_data.assert_called_once()
    mock_strategy.assert_called_once()
    mock_summariser.assert_called_once()


@patch("app.routers.orchestrator.create_briefing")
@patch("app.routers.orchestrator.analyse_strategy")
@patch("app.routers.orchestrator.fetch_race_context")
async def test_pipeline_handles_data_agent_error(mock_data, mock_strategy, mock_summariser):
    mock_data.side_effect = Exception("OpenF1 down")

    result = await run_pipeline("Should Norris pit?", session_key=None)
    assert isinstance(result, OrchestratorResponse)
    assert "error" in result.briefing.lower() or "unavailable" in result.briefing.lower()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_orchestrator.py -v
```

Expected: FAIL — `ImportError`

- [ ] **Step 3: Implement `backend/app/routers/orchestrator.py`**

```python
import logging
from fastapi import APIRouter
from app.models.schemas import (
    OrchestratorRequest, OrchestratorResponse, RaceContext,
)
from app.agents.data_agent import fetch_race_context
from app.agents.strategy_agent import analyse_strategy
from app.agents.summariser_agent import create_briefing

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])


async def run_pipeline(question: str, session_key: str | None = None) -> OrchestratorResponse:
    try:
        race_context = await fetch_race_context(session_key=session_key)
    except Exception as e:
        logger.error("Data agent failed: %s", e)
        return OrchestratorResponse(
            briefing="Strategy unavailable — unable to fetch race data.",
            strategy_reasoning=f"Data agent error: {e}",
            race_context=RaceContext(session_key="", positions=[], stints=[], laps=[], weather=None),
        )

    try:
        strategy_output = await analyse_strategy(question, race_context)
    except Exception as e:
        logger.error("Strategy agent failed: %s", e)
        return OrchestratorResponse(
            briefing="Strategy unavailable — analysis failed.",
            strategy_reasoning=f"Strategy agent error: {e}",
            race_context=race_context,
        )

    try:
        briefing = await create_briefing(strategy_output, race_context)
    except Exception as e:
        logger.error("Summariser agent failed: %s", e)
        briefing = f"Raw strategy: {strategy_output.reasoning}"

    return OrchestratorResponse(
        briefing=briefing,
        strategy_reasoning=strategy_output.reasoning,
        race_context=race_context,
    )


@router.post("/query", response_model=OrchestratorResponse)
async def query(request: OrchestratorRequest):
    return await run_pipeline(request.question, request.session_key)
```

- [ ] **Step 4: Register orchestrator router in `backend/app/main.py`**

Add to the existing imports and includes:

```python
from app.routers import data, strategy, summariser, orchestrator

app.include_router(orchestrator.router)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_orchestrator.py -v
```

Expected: All 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/orchestrator.py backend/tests/test_orchestrator.py backend/app/main.py
git commit -m "feat: orchestrator — sequential pipeline with error handling"
```

---

### Task 10: WebSocket endpoint

**Files:**
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_websocket.py`

- [ ] **Step 1: Write failing test for WebSocket**

Create `backend/tests/test_websocket.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app


@patch("app.main.run_pipeline")
def test_websocket_query(mock_pipeline):
    from app.models.schemas import OrchestratorResponse, RaceContext
    mock_pipeline.return_value = OrchestratorResponse(
        briefing="Box box box.",
        strategy_reasoning="Norris should pit.",
        race_context=RaceContext(session_key="9558", positions=[], stints=[], laps=[], weather=None),
    )

    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "query", "question": "Should Norris pit?"})

        messages = []
        while True:
            msg = ws.receive_json()
            messages.append(msg)
            if msg["type"] in ("result", "error"):
                break

        types = [m["type"] for m in messages]
        assert "result" in types
        result = next(m for m in messages if m["type"] == "result")
        assert result["briefing"] == "Box box box."
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_websocket.py -v
```

Expected: FAIL

- [ ] **Step 3: Add WebSocket endpoint to `backend/app/main.py`**

Add to `main.py`:

```python
import logging
from fastapi import WebSocket, WebSocketDisconnect
from app.agents.data_agent import fetch_race_context
from app.agents.strategy_agent import analyse_strategy
from app.agents.summariser_agent import create_briefing
from app.models.schemas import RaceContext

logger = logging.getLogger(__name__)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()

            if data.get("type") != "query":
                await ws.send_json({"type": "error", "message": "Unknown message type"})
                continue

            question = data.get("question", "")
            session_key = data.get("session_key")

            for agent in ["data", "strategy", "summariser"]:
                await ws.send_json({"type": "status", "agent": agent, "state": "pending"})

            try:
                await ws.send_json({"type": "status", "agent": "data", "state": "running"})
                race_context = await fetch_race_context(session_key=session_key)
                await ws.send_json({"type": "status", "agent": "data", "state": "complete"})

                await ws.send_json({"type": "status", "agent": "strategy", "state": "running"})
                strategy_output = await analyse_strategy(question, race_context)
                await ws.send_json({"type": "status", "agent": "strategy", "state": "complete"})

                await ws.send_json({"type": "status", "agent": "summariser", "state": "running"})
                briefing = await create_briefing(strategy_output, race_context)
                await ws.send_json({"type": "status", "agent": "summariser", "state": "complete"})

                await ws.send_json({
                    "type": "result",
                    "briefing": briefing,
                    "strategy_reasoning": strategy_output.reasoning,
                    "race_context": race_context.model_dump(),
                })
            except Exception as e:
                logger.error("Pipeline error: %s", e)
                await ws.send_json({"type": "error", "message": str(e)})
    except WebSocketDisconnect:
        pass
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_websocket.py -v
```

Expected: PASS

- [ ] **Step 5: Run all backend tests**

```bash
pytest tests/ -v
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/main.py backend/tests/test_websocket.py
git commit -m "feat: WebSocket endpoint for streaming pipeline status and results"
```

---

## Chunk 4: Frontend Setup & Components

### Task 11: Frontend project setup

**Files:**
- Create: `frontend/` (Vite React TypeScript project)
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Scaffold Vite React TypeScript project**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install tailwindcss @tailwindcss/vite framer-motion lucide-react
```

- [ ] **Step 2: Configure Tailwind with Vite plugin**

Update `frontend/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 3: Set up Tailwind in `frontend/src/index.css`**

Replace contents of `frontend/src/index.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Clean up default Vite files**

Delete `frontend/src/App.css` and clear `frontend/src/App.tsx` to a minimal shell:

```tsx
function App() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <p className="p-8 text-white/50">F1 Strategy Agents</p>
    </div>
  );
}

export default App;
```

- [ ] **Step 5: Verify frontend runs**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/frontend
npm run dev
```

Expected: Opens at `http://localhost:5173`, shows "F1 Strategy Agents" on near-black background

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: frontend scaffold — Vite + React + TypeScript + Tailwind"
```

---

### Task 12: Shared TypeScript types and API client

**Files:**
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: Create `frontend/src/lib/types.ts`**

```typescript
export type DriverPosition = {
  driver: string;
  position: number;
  gap_to_leader: number;
};

export type TyreStint = {
  driver: string;
  compound: "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET";
  tyre_age: number;
  stint_number: number;
};

export type LapTime = {
  driver: string;
  lap_number: number;
  lap_time: number;
};

export type Weather = {
  track_temp: number;
  air_temp: number;
  rain_risk: number;
};

export type RaceContext = {
  session_key: string;
  positions: DriverPosition[];
  stints: TyreStint[];
  laps: LapTime[];
  weather: Weather | null;
};

export type StrategyOutput = {
  reasoning: string;
  recommendation: "PIT" | "STAY_OUT" | "OPPOSITE" | "FLEXIBLE";
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

export type WsMessage =
  | { type: "query"; question: string; session_key?: string }
  | { type: "status"; agent: string; state: "pending" | "running" | "complete" }
  | { type: "result"; briefing: string; strategy_reasoning: string; race_context: RaceContext }
  | { type: "error"; message: string };

export type ChatMessage = {
  id: string;
  role: "user" | "engineer";
  content: string;
  timestamp: number;
};
```

- [ ] **Step 2: Create `frontend/src/lib/api.ts`**

```typescript
const BASE_URL = "/api";

export async function fetchDrivers(sessionKey?: string) {
  const params = sessionKey ? `?session_key=${sessionKey}` : "";
  const res = await fetch(`${BASE_URL}/data/drivers${params}`);
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/frontend
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/
git commit -m "feat: TypeScript types and API client matching backend contracts"
```

---

### Task 13: WebSocket hook

**Files:**
- Create: `frontend/src/hooks/useWebSocket.ts`

- [ ] **Step 1: Create `frontend/src/hooks/useWebSocket.ts`**

```typescript
import { useRef, useState, useCallback, useEffect } from "react";
import type { WsMessage } from "../lib/types";

type AgentStatus = Record<string, "pending" | "running" | "complete">;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({});
  const [lastResult, setLastResult] = useState<Extract<WsMessage, { type: "result" }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };

    ws.onmessage = (event) => {
      const msg: WsMessage = JSON.parse(event.data);

      if (msg.type === "status") {
        setAgentStatus((prev) => ({ ...prev, [msg.agent]: msg.state }));
      } else if (msg.type === "result") {
        setLastResult(msg);
        setLoading(false);
        setAgentStatus({});
      } else if (msg.type === "error") {
        setError(msg.message);
        setLoading(false);
        setAgentStatus({});
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const sendQuery = useCallback((question: string, sessionKey?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setLoading(true);
    setError(null);
    setLastResult(null);
    setAgentStatus({});
    const msg: WsMessage = { type: "query", question, session_key: sessionKey };
    wsRef.current.send(JSON.stringify(msg));
  }, []);

  return { connected, agentStatus, lastResult, error, loading, sendQuery };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/frontend
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: useWebSocket hook with auto-reconnect and agent status tracking"
```

---

### Task 14: Frontend components — Chat and Sidebar

**Files:**
- Create: `frontend/src/components/MessageBubble.tsx`
- Create: `frontend/src/components/ChatPanel.tsx`
- Create: `frontend/src/components/PositionsCard.tsx`
- Create: `frontend/src/components/TyresCard.tsx`
- Create: `frontend/src/components/WeatherCard.tsx`
- Create: `frontend/src/components/DashboardSidebar.tsx`
- Modify: `frontend/src/App.tsx`

**Design reference:** Glass & Depth theme from spec. Use `@frontend-design` skill for implementation. Use `@vercel-react-best-practices` for React patterns.

- [ ] **Step 1: Create `frontend/src/components/MessageBubble.tsx`**

```tsx
import { motion } from "framer-motion";
import type { ChatMessage } from "../lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isEngineer = message.role === "engineer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`max-w-[80%] ${isEngineer ? "self-start" : "self-end"}`}
    >
      {isEngineer && (
        <span className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold mb-1 block">
          Race Engineer
        </span>
      )}
      <div
        className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isEngineer
            ? "bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl border-l-2 border-l-violet-500"
            : "bg-white/[0.06] border border-white/[0.08]"
        }`}
      >
        <p className="text-white/80">{message.content}</p>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/ChatPanel.tsx`**

```tsx
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "../lib/types";

type Props = {
  messages: ChatMessage[];
  onSend: (question: string) => void;
  loading: boolean;
  agentStatus: Record<string, string>;
};

export function ChatPanel({ messages, onSend, loading, agentStatus }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput("");
  };

  const activeAgent = Object.entries(agentStatus).find(([, s]) => s === "running");

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {loading && activeAgent && (
          <div className="text-xs text-violet-400/60 uppercase tracking-widest animate-pulse">
            {activeAgent[0]} agent running...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-full px-4 py-2 backdrop-blur-xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your engineer..."
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 hover:bg-violet-500/30 transition-colors disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/PositionsCard.tsx`**

```tsx
import type { DriverPosition } from "../lib/types";

export function PositionsCard({ positions }: { positions: DriverPosition[] }) {
  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <h3 className="text-[9px] uppercase tracking-[1.5px] text-violet-400/50 mb-3">
        Positions
      </h3>
      <div className="flex flex-col gap-1.5">
        {positions.slice(0, 10).map((p) => (
          <div
            key={p.driver}
            className={`flex justify-between items-center text-xs px-2 py-1 rounded-md ${
              p.position === 1 ? "bg-violet-500/[0.06]" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-white/20 w-4 text-[10px]">{p.position}</span>
              <span className="text-white font-medium">{p.driver}</span>
            </div>
            <span className="text-white/40 font-mono text-[11px]">
              +{p.gap_to_leader.toFixed(1)}s
            </span>
          </div>
        ))}
        {positions.length === 0 && (
          <p className="text-white/20 text-xs">No position data</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/TyresCard.tsx`**

```tsx
import type { TyreStint } from "../lib/types";

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "text-red-400",
  MEDIUM: "text-yellow-400",
  HARD: "text-white/60",
  INTERMEDIATE: "text-green-400",
  WET: "text-blue-400",
};

export function TyresCard({ stints }: { stints: TyreStint[] }) {
  const latestByDriver = new Map<string, TyreStint>();
  for (const stint of stints) {
    const existing = latestByDriver.get(stint.driver);
    if (!existing || stint.stint_number > existing.stint_number) {
      latestByDriver.set(stint.driver, stint);
    }
  }

  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <h3 className="text-[9px] uppercase tracking-[1.5px] text-violet-400/50 mb-3">
        Tyres
      </h3>
      <div className="flex flex-col gap-1.5">
        {[...latestByDriver.values()].map((s) => (
          <div key={s.driver} className="flex justify-between items-center text-xs px-2">
            <span className="text-white font-medium">{s.driver}</span>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${COMPOUND_COLORS[s.compound] ?? "text-white/40"}`}>
                {s.compound[0]}
              </span>
              <span className="text-white/40 font-mono text-[11px]">L{s.tyre_age}</span>
            </div>
          </div>
        ))}
        {stints.length === 0 && (
          <p className="text-white/20 text-xs">No tyre data</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/WeatherCard.tsx`**

```tsx
import { Cloud } from "lucide-react";
import type { Weather } from "../lib/types";

export function WeatherCard({ weather }: { weather: Weather | null }) {
  if (!weather) {
    return (
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <h3 className="text-[9px] uppercase tracking-[1.5px] text-violet-400/50 mb-3">Weather</h3>
        <p className="text-white/20 text-xs">No weather data</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <h3 className="text-[9px] uppercase tracking-[1.5px] text-violet-400/50 mb-3">Weather</h3>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-white/40">Track</span>
          <span className="text-white font-mono">{weather.track_temp}°C</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Air</span>
          <span className="text-white font-mono">{weather.air_temp}°C</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/40">Rain</span>
          <div className="flex items-center gap-1.5">
            <Cloud size={12} className="text-white/30" />
            <span className="text-white font-mono">{weather.rain_risk}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/DashboardSidebar.tsx`**

```tsx
import { motion } from "framer-motion";
import { PositionsCard } from "./PositionsCard";
import { TyresCard } from "./TyresCard";
import { WeatherCard } from "./WeatherCard";
import type { RaceContext } from "../lib/types";

export function DashboardSidebar({ context }: { context: RaceContext | null }) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-72 flex flex-col gap-3 p-4 overflow-y-auto"
    >
      <PositionsCard positions={context?.positions ?? []} />
      <TyresCard stints={context?.stints ?? []} />
      <WeatherCard weather={context?.weather ?? null} />
    </motion.aside>
  );
}
```

- [ ] **Step 7: Wire up `frontend/src/App.tsx`**

```tsx
import { useState, useCallback, useEffect } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { DashboardSidebar } from "./components/DashboardSidebar";
import { useWebSocket } from "./hooks/useWebSocket";
import type { ChatMessage, RaceContext } from "./lib/types";

function App() {
  const { connected, agentStatus, lastResult, error, loading, sendQuery } = useWebSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [raceContext, setRaceContext] = useState<RaceContext | null>(null);

  const handleSend = useCallback(
    (question: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      sendQuery(question);
    },
    [sendQuery],
  );

  useEffect(() => {
    if (!lastResult) return;
    const engineerMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "engineer",
      content: lastResult.briefing,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, engineerMsg]);
    setRaceContext(lastResult.race_context);
  }, [lastResult]);

  return (
    <div className="h-screen bg-[#09090b] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">Strategy</h1>
          {connected && (
            <span className="text-[10px] text-violet-400/60 uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded">
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-[10px] text-white/30">{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0">
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            loading={loading}
            agentStatus={agentStatus}
          />
        </main>
        <div className="border-l border-white/[0.06]">
          <DashboardSidebar context={raceContext} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 8: Verify frontend renders**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/frontend
npm run dev
```

Expected: Glass & Depth themed UI with chat panel and sidebar at `http://localhost:5173`

- [ ] **Step 9: Commit**

```bash
git add frontend/src/
git commit -m "feat: frontend components — chat panel, dashboard sidebar, Glass & Depth theme"
```

---

## Chunk 5: Integration & Polish

### Task 15: End-to-end integration test

**Files:**
- Create: `backend/tests/test_integration.py`

- [ ] **Step 1: Write integration test**

Create `backend/tests/test_integration.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.mock_data import (
    MOCK_SESSION, MOCK_POSITIONS, MOCK_DRIVERS, MOCK_STINTS,
    MOCK_LAPS, MOCK_WEATHER, MOCK_INTERVALS,
)


@pytest.fixture
def mock_all_openf1():
    """Mock all OpenF1 API calls."""
    with patch("app.agents.data_agent.openf1") as mock_module:
        client_mock = AsyncMock()
        mock_module.fetch_latest_session = AsyncMock(return_value=MOCK_SESSION)
        mock_module.fetch_positions = AsyncMock(return_value=MOCK_POSITIONS)
        mock_module.fetch_drivers = AsyncMock(return_value=MOCK_DRIVERS)
        mock_module.fetch_stints = AsyncMock(return_value=MOCK_STINTS)
        mock_module.fetch_laps = AsyncMock(return_value=MOCK_LAPS)
        mock_module.fetch_weather = AsyncMock(return_value=MOCK_WEATHER)
        mock_module.fetch_intervals = AsyncMock(return_value=MOCK_INTERVALS)
        yield mock_module


@pytest.fixture
def mock_gemini():
    """Mock Gemini LLM call."""
    with patch("app.agents.strategy_agent.generate_strategy") as mock:
        mock.return_value = (
            "REASONING: Norris on 22-lap mediums, gap 1.2s. Undercut is viable.\n\n"
            "RECOMMENDATION: PIT\n\n"
            "CONFIDENCE: HIGH"
        )
        yield mock


async def test_full_pipeline_via_orchestrator(mock_all_openf1, mock_gemini):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/orchestrator/query",
            json={"question": "Should Norris pit now?"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "briefing" in data
    assert "strategy_reasoning" in data
    assert "race_context" in data
    assert len(data["race_context"]["positions"]) > 0


async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/backend
source .venv/bin/activate
pytest tests/ -v
```

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_integration.py
git commit -m "test: end-to-end integration tests for full pipeline"
```

---

### Task 16: Final cleanup and verification

- [ ] **Step 1: Verify backend starts clean**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/backend
source .venv/bin/activate
uvicorn app.main:app --port 8000
```

Visit `http://localhost:8000/docs` — all endpoints should be visible.

- [ ] **Step 2: Verify frontend starts and connects**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/frontend
npm run dev
```

Visit `http://localhost:5173` — UI should render with Glass & Depth theme. Connection indicator should show status.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents/backend
pytest tests/ -v
```

Expected: All tests PASS

- [ ] **Step 4: Final commit**

```bash
cd /Users/tommyclark/Developer/projects/f1-strategy-agents
git add backend/ frontend/ CLAUDE.md docs/
git commit -m "chore: final cleanup — project ready for development"
```
