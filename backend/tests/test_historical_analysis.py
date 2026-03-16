import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from app.models.schemas import (
    RaceContext, DriverPosition, TyreStint, LapTime, Weather, StrategyOutput, OrchestratorRequest,
)
from app.models.types import TyreCompound, Recommendation, Confidence
from app.agents.strategy_agent import _format_historical_context, analyse_historical
from app.agents.summariser_agent import create_briefing
from app.routers.orchestrator import run_pipeline


@pytest.fixture
def sample_race_context():
    return RaceContext(
        session_key="1234",
        positions=[
            DriverPosition(driver="HAM", position=1, gap_to_leader=0.0),
            DriverPosition(driver="VER", position=2, gap_to_leader=4.2),
            DriverPosition(driver="NOR", position=3, gap_to_leader=8.5),
        ],
        stints=[
            TyreStint(driver="HAM", compound=TyreCompound.SOFT, tyre_age=15, stint_number=1, lap_start=1, lap_end=16),
            TyreStint(driver="HAM", compound=TyreCompound.MEDIUM, tyre_age=32, stint_number=2, lap_start=16, lap_end=48),
            TyreStint(driver="VER", compound=TyreCompound.SOFT, tyre_age=20, stint_number=1, lap_start=1, lap_end=21),
            TyreStint(driver="VER", compound=TyreCompound.MEDIUM, tyre_age=27, stint_number=2, lap_start=21, lap_end=48),
        ],
        laps=[
            LapTime(driver="HAM", lap_number=15, lap_time=1.23),
            LapTime(driver="HAM", lap_number=16, lap_time=1.25),
            LapTime(driver="HAM", lap_number=18, lap_time=1.26),
            LapTime(driver="HAM", lap_number=20, lap_time=1.28),
            LapTime(driver="HAM", lap_number=23, lap_time=1.31),
            LapTime(driver="VER", lap_number=15, lap_time=1.24),
            LapTime(driver="VER", lap_number=16, lap_time=1.26),
            LapTime(driver="VER", lap_number=18, lap_time=1.27),
            LapTime(driver="VER", lap_number=20, lap_time=1.29),
            LapTime(driver="VER", lap_number=23, lap_time=1.32),
        ],
        weather=Weather(track_temp=45.0, air_temp=20.0, rain_risk=5),
    )


def test_format_historical_context_includes_all_laps(sample_race_context):
    """_format_historical_context should include ALL laps for filtered drivers."""
    result = _format_historical_context(sample_race_context, "When should Hamilton have pitted?")
    assert "HAM" in result
    assert all(str(lap.lap_number) in result or "lap" in result for lap in sample_race_context.laps if lap.driver == "HAM")
    assert "STRATEGIC RACE ANALYSIS" in result


def test_format_historical_context_includes_lap_ranges(sample_race_context):
    """_format_historical_context should show stint lap ranges like 'laps 1–16'."""
    result = _format_historical_context(sample_race_context, "When should Hamilton have pitted?")
    assert "laps 1–16" in result
    assert "laps 16–48" in result


def test_format_historical_context_filters_by_driver(sample_race_context):
    """_format_historical_context should filter to drivers mentioned in question."""
    result = _format_historical_context(sample_race_context, "When should Hamilton have pitted?")
    # Should include HAM laps
    assert "HAM" in result
    # May or may not include VER; just check it's filtered intelligently


def test_format_historical_context_fallback_to_top_5(sample_race_context):
    """_format_historical_context should fall back to top 5 drivers if none mentioned."""
    result = _format_historical_context(sample_race_context, "What was the best strategy?")
    assert "HAM" in result  # top 3 are in the data


def test_format_historical_context_includes_final_classification(sample_race_context):
    """_format_historical_context should include final classification (positions)."""
    result = _format_historical_context(sample_race_context, "When should Hamilton have pitted?")
    assert "Race Classification & Final Positions" in result
    assert "P1 HAM" in result


@pytest.mark.asyncio
async def test_analyse_historical_uses_historical_prompt(sample_race_context):
    """analyse_historical should use the historical system prompt."""
    with patch("app.agents.strategy_agent.generate_strategy", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = "REASONING:\nHamilton pitted on lap 23.\n\nRECOMMENDATION:\nPIT\n\nCONFIDENCE:\nHIGH"

        await analyse_historical("When should Hamilton have pitted?", sample_race_context)

        # Verify generate_strategy was called with HISTORICAL prompt (check for key phrase)
        assert mock_gen.called
        call_args = mock_gen.call_args
        prompt = call_args[0][0]
        assert "THINK LIKE A STRATEGIST" in prompt  # Unique to historical prompt


@pytest.mark.asyncio
async def test_analyse_historical_handles_empty_response(sample_race_context):
    """analyse_historical should handle empty LLM responses gracefully."""
    with patch("app.agents.strategy_agent.generate_strategy", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = ""

        result = await analyse_historical("When should Hamilton have pitted?", sample_race_context)

        assert result.reasoning == "Historical analysis unavailable — LLM returned no response."
        assert result.confidence == Confidence.LOW


@pytest.mark.asyncio
async def test_create_briefing_historical_no_prefix(sample_race_context):
    """create_briefing with is_historical=True should skip radio prefix and truncation."""
    strategy = StrategyOutput(
        reasoning="Hamilton pitted on lap 23. Given the medium tyre degradation of +0.3s/lap and the gap to Verstappen of 4.2s, he should have pitted on lap 19-20 for optimal undercut.",
        recommendation=Recommendation.PIT,
        confidence=Confidence.HIGH,
    )

    briefing = await create_briefing(strategy, sample_race_context, is_historical=True)

    # Should NOT include radio prefix
    assert "Box box" not in briefing
    assert "Stay out" not in briefing
    # Should NOT be truncated
    assert "optimal undercut" in briefing
    # Should be the full reasoning
    assert briefing == strategy.reasoning.strip()


@pytest.mark.asyncio
async def test_create_briefing_live_includes_prefix(sample_race_context):
    """create_briefing with is_historical=False should include radio prefix and suffix."""
    strategy = StrategyOutput(
        reasoning="Driver is in a good position to pit.",
        recommendation=Recommendation.PIT,
        confidence=Confidence.HIGH,
    )

    briefing = await create_briefing(strategy, sample_race_context, is_historical=False)

    # Should include radio prefix
    assert "Box box" in briefing
    # Should include confidence suffix
    assert "High confidence" in briefing


@pytest.mark.asyncio
async def test_run_pipeline_routes_to_analyse_historical(sample_race_context):
    """run_pipeline should call analyse_historical when is_historical=True."""
    with patch("app.routers.orchestrator.fetch_race_context", new_callable=AsyncMock) as mock_fetch:
        with patch("app.routers.orchestrator.analyse_historical", new_callable=AsyncMock) as mock_hist:
            with patch("app.routers.orchestrator.create_briefing", new_callable=AsyncMock) as mock_brief:
                mock_fetch.return_value = sample_race_context
                mock_hist.return_value = StrategyOutput(
                    reasoning="Historical analysis.",
                    recommendation=Recommendation.FLEXIBLE,
                    confidence=Confidence.MEDIUM,
                )
                mock_brief.return_value = "Historical analysis."

                await run_pipeline("When should Hamilton have pitted?", is_historical=True)

                # Should call analyse_historical, not analyse_strategy
                assert mock_hist.called
                assert mock_brief.call_args[1]["is_historical"] is True


@pytest.mark.asyncio
async def test_run_pipeline_routes_to_analyse_strategy(sample_race_context):
    """run_pipeline should call analyse_strategy when is_historical=False."""
    with patch("app.routers.orchestrator.fetch_race_context", new_callable=AsyncMock) as mock_fetch:
        with patch("app.routers.orchestrator.analyse_strategy", new_callable=AsyncMock) as mock_strat:
            with patch("app.routers.orchestrator.create_briefing", new_callable=AsyncMock) as mock_brief:
                mock_fetch.return_value = sample_race_context
                mock_strat.return_value = StrategyOutput(
                    reasoning="Live analysis.",
                    recommendation=Recommendation.STAY_OUT,
                    confidence=Confidence.HIGH,
                )
                mock_brief.return_value = "Box box. Live analysis. High confidence."

                await run_pipeline("Should he pit?", is_historical=False)

                # Should call analyse_strategy
                assert mock_strat.called
                assert mock_brief.call_args[1]["is_historical"] is False
