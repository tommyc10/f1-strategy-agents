import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
from app.main import app


async def test_list_sessions_returns_past_races():
    mock_sessions = [
        {"session_key": 9662, "session_type": "Race", "date_start": "2024-12-08T14:00:00+00:00", "location": "Yas Island", "country_name": "United Arab Emirates", "year": 2024},
        {"session_key": 99999, "session_type": "Race", "date_start": "2099-12-08T14:00:00+00:00", "location": "Future", "country_name": "Mars", "year": 2099},
    ]

    with patch("app.routers.data.openf1._get", new_callable=AsyncMock, return_value=mock_sessions):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/data/sessions")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1  # future race filtered out
    assert data[0]["location"] == "Yas Island"
