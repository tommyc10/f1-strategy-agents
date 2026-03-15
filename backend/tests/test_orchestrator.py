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
