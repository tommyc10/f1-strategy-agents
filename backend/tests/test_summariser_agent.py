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
