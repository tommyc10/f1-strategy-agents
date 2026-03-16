import logging
from app.models.schemas import StrategyOutput, RaceContext
from app.models.types import Recommendation, Confidence

logger = logging.getLogger(__name__)

CALL_PREFIX = {
    Recommendation.PIT: "Box box box.",
    Recommendation.STAY_OUT: "Stay out, stay out.",
    Recommendation.OPPOSITE: "We're going opposite.",
    Recommendation.FLEXIBLE: "Standby, we're looking at options.",
}

CONFIDENCE_SUFFIX = {
    Confidence.HIGH: "High confidence.",
    Confidence.MEDIUM: "Moderate confidence — keep us updated.",
    Confidence.LOW: "Low confidence — be ready to adapt.",
}


async def create_briefing(strategy: StrategyOutput, context: RaceContext, is_historical: bool = False) -> str:
    reasoning = strategy.reasoning.strip()

    # For historical analysis, return full reasoning without radio-style formatting or truncation
    if is_historical:
        return reasoning

    # For live race: radio-style prefix + reasoning + confidence suffix
    prefix = CALL_PREFIX.get(strategy.recommendation, CALL_PREFIX[Recommendation.FLEXIBLE])
    suffix = CONFIDENCE_SUFFIX[strategy.confidence]

    # Trim to keep it radio-concise
    if len(reasoning) > 300:
        reasoning = reasoning[:297] + "..."

    return f"{prefix} {reasoning} {suffix}"
