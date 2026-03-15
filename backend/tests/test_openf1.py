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
