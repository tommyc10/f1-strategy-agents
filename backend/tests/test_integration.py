import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.mock_data import (
    MOCK_SESSION, MOCK_POSITIONS, MOCK_DRIVERS, MOCK_STINTS,
    MOCK_LAPS, MOCK_WEATHER, MOCK_INTERVALS, MOCK_SECTORS,
)


@pytest.fixture
def mock_all_openf1():
    """Mock all OpenF1 API calls."""
    with patch("app.agents.data_agent.openf1") as mock_module:
        mock_module.fetch_latest_session = AsyncMock(return_value=MOCK_SESSION)
        mock_module.fetch_positions = AsyncMock(return_value=MOCK_POSITIONS)
        mock_module.fetch_drivers = AsyncMock(return_value=MOCK_DRIVERS)
        mock_module.fetch_stints = AsyncMock(return_value=MOCK_STINTS)
        mock_module.fetch_laps = AsyncMock(return_value=MOCK_LAPS)
        mock_module.fetch_sectors = AsyncMock(return_value=MOCK_SECTORS)
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
