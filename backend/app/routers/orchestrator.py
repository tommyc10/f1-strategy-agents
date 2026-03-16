import logging
from fastapi import APIRouter
from app.models.schemas import (
    OrchestratorRequest, OrchestratorResponse, RaceContext,
)
from app.agents.data_agent import fetch_race_context
from app.agents.strategy_agent import analyse_strategy, analyse_historical
from app.agents.summariser_agent import create_briefing

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])


async def run_pipeline(question: str, session_key: str | None = None, is_historical: bool = False) -> OrchestratorResponse:
    try:
        race_context = await fetch_race_context(session_key=session_key)
    except Exception as e:
        logger.error("Data agent failed: %s", e)
        return OrchestratorResponse(
            briefing="Strategy unavailable — unable to fetch race data.",
            strategy_reasoning=f"Data agent error: {e}",
            race_context=RaceContext(session_key="", positions=[], stints=[], laps=[], weather=None),
        )

    try:
        if is_historical:
            strategy_output = await analyse_historical(question, race_context)
        else:
            strategy_output = await analyse_strategy(question, race_context)
    except Exception as e:
        logger.error("Strategy agent failed: %s", e)
        return OrchestratorResponse(
            briefing="Strategy unavailable — analysis failed.",
            strategy_reasoning=f"Strategy agent error: {e}",
            race_context=race_context,
        )

    try:
        briefing = await create_briefing(strategy_output, race_context, is_historical=is_historical)
    except Exception as e:
        logger.error("Summariser agent failed: %s", e)
        briefing = f"Raw strategy: {strategy_output.reasoning}"

    return OrchestratorResponse(
        briefing=briefing,
        strategy_reasoning=strategy_output.reasoning,
        race_context=race_context,
    )


@router.post("/query", response_model=OrchestratorResponse)
async def query(request: OrchestratorRequest):
    return await run_pipeline(request.question, request.session_key, request.is_historical)
