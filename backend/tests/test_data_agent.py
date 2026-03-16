import pytest
from unittest.mock import AsyncMock, patch
from app.agents.data_agent import fetch_race_context
from app.models.schemas import RaceContext
from tests.mock_data import (
    MOCK_SESSION, MOCK_POSITIONS, MOCK_DRIVERS, MOCK_STINTS,
    MOCK_LAPS, MOCK_WEATHER, MOCK_INTERVALS, MOCK_SECTORS,
)


def _mock_openf1(**overrides):
    defaults = {
        "fetch_latest_session": AsyncMock(return_value=MOCK_SESSION),
        "fetch_positions": AsyncMock(return_value=MOCK_POSITIONS),
        "fetch_drivers": AsyncMock(return_value=MOCK_DRIVERS),
        "fetch_stints": AsyncMock(return_value=MOCK_STINTS),
        "fetch_laps": AsyncMock(return_value=MOCK_LAPS),
        "fetch_sectors": AsyncMock(return_value=MOCK_SECTORS),
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
