from fastapi import APIRouter
from app.models.schemas import SummariserRequest, SummariserResponse
from app.agents.summariser_agent import create_briefing

router = APIRouter(prefix="/summariser", tags=["summariser"])


@router.post("/brief", response_model=SummariserResponse)
async def brief(request: SummariserRequest):
    result = await create_briefing(request.strategy_output, request.race_context)
    return SummariserResponse(briefing=result)
