import logging
import re
from pathlib import Path
from app.services.gemini import generate_strategy
from app.models.schemas import RaceContext, StrategyOutput
from app.models.types import Recommendation, Confidence

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "strategy_system.txt"
SYSTEM_PROMPT = PROMPT_PATH.read_text()

HISTORICAL_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "historical_analysis_system.txt"
HISTORICAL_SYSTEM_PROMPT = HISTORICAL_PROMPT_PATH.read_text()


def _format_race_context(context: RaceContext) -> str:
    lines = [f"Session: {context.session_key}"]

    if context.positions:
        lines.append("\nPositions:")
        for p in context.positions:
            lines.append(f"  P{p.position} {p.driver} — gap to leader: {p.gap_to_leader}s")

    if context.stints:
        lines.append("\nTyre Stints:")
        for s in context.stints:
            lines.append(f"  {s.driver} — {s.compound.value} compound, {s.tyre_age} laps old (stint {s.stint_number})")

    if context.laps:
        lines.append("\nRecent Laps:")
        for lap in context.laps[-10:]:
            lines.append(f"  {lap.driver} lap {lap.lap_number}: {lap.lap_time:.3f}s")

    if context.weather:
        w = context.weather
        lines.append(f"\nWeather: track {w.track_temp}°C, air {w.air_temp}°C, rain risk {w.rain_risk}%")

    return "\n".join(lines)


def _filter_drivers_in_question(question: str, context: RaceContext) -> set[str]:
    """Extract driver codes mentioned in the question. Fall back to top 5 if none found."""
    mentioned = set()
    question_upper = question.upper()
    for p in context.positions[:20]:  # check top 20 drivers
        if p.driver in question_upper:
            mentioned.add(p.driver)
    return mentioned if mentioned else {p.driver for p in context.positions[:5]}


def _format_historical_context(context: RaceContext, question: str) -> str:
    """Format race context for historical analysis with full lap data and stint ranges."""
    lines = ["HISTORICAL RACE"]
    lines.append(f"Session: {context.session_key}")

    if context.positions:
        lines.append("\nFinal Classification:")
        for p in context.positions:
            lines.append(f"  P{p.position} {p.driver} — gap to leader: {p.gap_to_leader}s")

    # Filter laps to drivers mentioned in question, or top 5 if none found
    target_drivers = _filter_drivers_in_question(question, context)
    filtered_laps = [lap for lap in context.laps if lap.driver in target_drivers]

    if context.stints:
        lines.append("\nTyre Stints (all):")
        for s in context.stints:
            lines.append(f"  {s.driver} — stint {s.stint_number}: laps {s.lap_start}–{s.lap_end} ({s.compound.value}, {s.tyre_age} laps)")

    if filtered_laps:
        # Group laps by driver to show degradation trends
        laps_by_driver = {}
        for lap in filtered_laps:
            if lap.driver not in laps_by_driver:
                laps_by_driver[lap.driver] = []
            laps_by_driver[lap.driver].append(lap)

        # Limit to last 40 laps per driver to keep context manageable
        lines.append(f"\nLap Times ({', '.join(target_drivers)}) — Last 40 laps:")
        for driver in sorted(laps_by_driver.keys()):
            driver_laps = sorted(laps_by_driver[driver], key=lambda x: x.lap_number)[-40:]
            lines.append(f"  {driver}:")
            for i, lap in enumerate(driver_laps):
                degradation = ""
                if i > 0:
                    prev_time = driver_laps[i - 1].lap_time
                    delta = lap.lap_time - prev_time
                    if delta > 0.05:
                        degradation = f" (+{delta:.3f}s)"
                    elif delta < -0.05:
                        degradation = f" ({delta:.3f}s)"
                lines.append(f"    lap {lap.lap_number}: {lap.lap_time:.3f}s{degradation}")

    if context.weather:
        w = context.weather
        lines.append(f"\nWeather: track {w.track_temp}°C, air {w.air_temp}°C, rain risk {w.rain_risk}%")

    return "\n".join(lines)


def _parse_response(raw: str) -> StrategyOutput:
    reasoning_match = re.search(r"REASONING:\s*(.+?)(?=\nRECOMMENDATION:|\Z)", raw, re.DOTALL)
    recommendation_match = re.search(r"RECOMMENDATION:\s*(\w+)", raw)
    confidence_match = re.search(r"CONFIDENCE:\s*(\w+)", raw)

    reasoning = reasoning_match.group(1).strip() if reasoning_match else raw.strip() or "Unable to analyse — insufficient data."

    try:
        recommendation = Recommendation(recommendation_match.group(1).upper()) if recommendation_match else Recommendation.FLEXIBLE
    except ValueError:
        recommendation = Recommendation.FLEXIBLE

    try:
        confidence = Confidence(confidence_match.group(1).upper()) if confidence_match else Confidence.LOW
    except ValueError:
        confidence = Confidence.LOW

    return StrategyOutput(
        reasoning=reasoning,
        recommendation=recommendation,
        confidence=confidence,
    )


async def analyse_strategy(question: str, race_context: RaceContext) -> StrategyOutput:
    context_text = _format_race_context(race_context)
    user_message = f"Race Data:\n{context_text}\n\nQuestion: {question}"

    raw_response = await generate_strategy(SYSTEM_PROMPT, user_message)
    logger.info("Gemini raw response:\n%s", raw_response[:500])

    if not raw_response:
        return StrategyOutput(
            reasoning="Strategy analysis unavailable — LLM returned no response.",
            recommendation=Recommendation.FLEXIBLE,
            confidence=Confidence.LOW,
        )

    return _parse_response(raw_response)


async def analyse_historical(question: str, race_context: RaceContext) -> StrategyOutput:
    """Analyze a historical race using retrospective analysis prompt with full lap data."""
    context_text = _format_historical_context(race_context, question)
    user_message = f"{context_text}\n\nAnalyze: {question}"

    raw_response = await generate_strategy(HISTORICAL_SYSTEM_PROMPT, user_message)
    logger.info("Gemini historical analysis response:\n%s", raw_response[:500])

    if not raw_response:
        return StrategyOutput(
            reasoning="Historical analysis unavailable — LLM returned no response.",
            recommendation=Recommendation.FLEXIBLE,
            confidence=Confidence.LOW,
        )

    return _parse_response(raw_response)
