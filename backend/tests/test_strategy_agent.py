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
