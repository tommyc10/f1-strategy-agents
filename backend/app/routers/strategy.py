from fastapi import APIRouter
from app.models.schemas import StrategyRequest, StrategyResponse
from app.agents.strategy_agent import analyse_strategy

router = APIRouter(prefix="/strategy", tags=["strategy"])


@router.post("/analyse", response_model=StrategyResponse)
async def analyse(request: StrategyRequest):
    result = await analyse_strategy(request.question, request.race_context)
    return StrategyResponse(strategy_output=result)
