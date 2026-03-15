import logging
from app.models.schemas import StrategyOutput, RaceContext
from app.models.types import Recommendation, Confidence

logger = logging.getLogger(__name__)

TEMPLATES = {
    Recommendation.PIT: "Box box box. {tyre_detail}{gap_detail}",
    Recommendation.STAY_OUT: "Stay out, stay out. {tyre_detail}{gap_detail}",
    Recommendation.OPPOSITE: "We're going opposite strategy. {tyre_detail}{gap_detail}",
    Recommendation.FLEXIBLE: "Standby, we're looking at options. {tyre_detail}{gap_detail}",
}

CONFIDENCE_SUFFIX = {
    Confidence.HIGH: "High confidence on this call.",
    Confidence.MEDIUM: "Moderate confidence — monitor the situation.",
    Confidence.LOW: "Low confidence — be ready to adapt.",
}


def _tyre_detail(context: RaceContext) -> str:
    if not context.stints:
        return ""
    latest = context.stints[-1]
    return f"{latest.compound.value.capitalize()}s on {latest.tyre_age} laps. "


def _gap_detail(context: RaceContext) -> str:
    if len(context.positions) < 2:
        return ""
    gap = context.positions[0].gap_to_leader
    if gap == 0.0 and len(context.positions) > 1:
        gap = context.positions[1].gap_to_leader
    if gap > 0:
        return f"Gap is {gap:.1f}s. "
    return ""


async def create_briefing(strategy: StrategyOutput, context: RaceContext) -> str:
    template = TEMPLATES.get(strategy.recommendation, TEMPLATES[Recommendation.FLEXIBLE])
    tyre = _tyre_detail(context)
    gap = _gap_detail(context)

    briefing = template.format(tyre_detail=tyre, gap_detail=gap)
    briefing += CONFIDENCE_SUFFIX[strategy.confidence]

    return briefing.strip()
