import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from app.models.schemas import RaceContext, StrategyOutput
from app.models.types import Recommendation, Confidence


def _mock_context():
    return RaceContext(
        session_key="9558", positions=[], stints=[], laps=[], weather=None,
    )


def _mock_strategy():
    return StrategyOutput(
        reasoning="Norris should pit.",
        recommendation=Recommendation.PIT,
        confidence=Confidence.HIGH,
    )


async def _mock_stream(*args, **kwargs):
    """Mock async generator that yields the raw strategy text."""
    yield "REASONING: Norris should pit.\nRECOMMENDATION: PIT\nCONFIDENCE: HIGH"


@patch("app.main.create_briefing", new_callable=AsyncMock, return_value="Box box box.")
@patch("app.main.analyse_strategy_stream", return_value=_mock_stream())
@patch("app.main.fetch_race_context", new_callable=AsyncMock)
def test_websocket_query(mock_data, mock_strategy_stream, mock_summariser):
    mock_data.return_value = _mock_context()

    from app.main import app
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
        assert "status" in types
        assert "result" in types
        result = next(m for m in messages if m["type"] == "result")
        assert result["briefing"] == "Box box box."
