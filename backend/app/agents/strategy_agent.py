import logging
import re
from pathlib import Path
from app.services.gemini import generate_strategy
from app.models.schemas import RaceContext, StrategyOutput
from app.models.types import Recommendation, Confidence

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "strategy_system.txt"
SYSTEM_PROMPT = PROMPT_PATH.read_text()


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
