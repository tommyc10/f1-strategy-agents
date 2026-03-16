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
    """Format race context for STRATEGIC analysis (not data analysis)."""
    lines = ["STRATEGIC RACE ANALYSIS"]
    lines.append(f"Session: {context.session_key}")

    # Filter laps to drivers mentioned in question, or top 6 if none found
    target_drivers = _filter_drivers_in_question(question, context)

    # Build a strategic race narrative
    lines.append("\nRace Classification & Final Positions:")
    if context.positions:
        for p in context.positions[:10]:  # Top 10
            gap_str = f" +{p.gap_to_leader}s behind" if p.gap_to_leader > 0 else " LEADER"
            lines.append(f"  P{p.position} {p.driver}{gap_str}")

    # Strategy summary: Who pitted when
    if context.stints:
        lines.append("\nPit Strategy Summary (Top 6 Drivers):")
        stints_by_driver = {}
        for s in context.stints:
            if s.driver not in stints_by_driver:
                stints_by_driver[s.driver] = []
            stints_by_driver[s.driver].append(s)

        top_drivers = [p.driver for p in context.positions[:6]] if context.positions else list(stints_by_driver.keys())[:6]
        for driver in sorted(set(top_drivers) & set(stints_by_driver.keys())):
            driver_stints = sorted(stints_by_driver[driver], key=lambda x: x.stint_number)
            pit_laps = []
            for i, s in enumerate(driver_stints):
                if i > 0:  # Pit lap is start of next stint
                    pit_laps.append(str(s.lap_start))

            # Format: Driver: S1 (Compound, Laps) → S2 (Compound, Laps), Pitted on lap X
            stints_str = " → ".join([f"S{s.stint_number} {s.compound.value}({s.tyre_age}L)" for s in driver_stints])
            pit_str = f", pitted lap {pit_laps[0]}" if pit_laps else ""
            final_pos = next((p.position for p in context.positions if p.driver == driver), "DNF")
            lines.append(f"  {driver}: {stints_str}{pit_str} → P{final_pos}")

    # Target driver lap analysis
    filtered_laps = [lap for lap in context.laps if lap.driver in target_drivers]
    if filtered_laps:
        lines.append(f"\nLap Pace Analysis (Target Drivers: {', '.join(target_drivers)}):")
        lines.append("  (showing pace trends and degradation patterns)")

        laps_by_driver = {}
        for lap in filtered_laps:
            if lap.driver not in laps_by_driver:
                laps_by_driver[lap.driver] = []
            laps_by_driver[lap.driver].append(lap)

        # Limit to last 50 laps
        for driver in sorted(laps_by_driver.keys()):
            driver_laps = sorted(laps_by_driver[driver], key=lambda x: x.lap_number)[-50:]

            if driver in [s.driver for s in context.stints]:
                driver_stints = [s for s in context.stints if s.driver == driver]
                lines.append(f"  {driver}:")

                for stint in sorted(driver_stints, key=lambda x: x.stint_number):
                    stint_laps = [l for l in driver_laps if stint.lap_start <= l.lap_number <= stint.lap_end]
                    if stint_laps:
                        # Calculate pace trend for this stint
                        if len(stint_laps) > 3:
                            early_pace = sum(l.lap_time for l in stint_laps[:3]) / 3
                            late_pace = sum(l.lap_time for l in stint_laps[-3:]) / 3
                            degradation = late_pace - early_pace
                            trend = f" (degrading {abs(degradation):.3f}s over stint)" if degradation > 0.01 else f" (stable pace)"
                        else:
                            trend = ""

                        lines.append(f"    Stint {stint.stint_number} ({stint.compound.value}, laps {stint.lap_start}–{stint.lap_end}){trend}")
                        # Show a few key laps: first 3, middle, last 3
                        sample_indices = list(range(min(3, len(stint_laps)))) + [len(stint_laps)//2] + list(range(max(0, len(stint_laps)-3), len(stint_laps)))
                        sample_indices = sorted(set(sample_indices))

                        for idx in sample_indices:
                            if idx < len(stint_laps):
                                lap = stint_laps[idx]
                                pace = f" {lap.lap_time:.3f}s"
                                lines.append(f"      L{lap.lap_number}:{pace}")

    if context.weather:
        w = context.weather
        lines.append(f"\nRace Conditions: {w.track_temp}°C track, {w.air_temp}°C air, {w.rain_risk}% rain risk")

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
