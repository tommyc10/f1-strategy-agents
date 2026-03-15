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


async def test_create_briefing_includes_reasoning():
    result = await create_briefing(_sample_strategy_output(), _sample_context())
    assert "Norris" in result
    assert "mediums" in result


async def test_create_briefing_starts_with_call():
    result = await create_briefing(_sample_strategy_output(), _sample_context())
    assert result.startswith("Box box box.")


async def test_create_briefing_handles_stay_out():
    strategy = StrategyOutput(
        reasoning="Tyres are fine. Gap is comfortable.",
        recommendation=Recommendation.STAY_OUT,
        confidence=Confidence.HIGH,
    )
    result = await create_briefing(strategy, _sample_context())
    assert result.startswith("Stay out, stay out.")
    assert "Tyres are fine" in result
