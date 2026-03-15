from fastapi import APIRouter
from app.models.schemas import DataFetchRequest, DataFetchResponse, DriversResponse, Driver
from app.agents.data_agent import fetch_race_context
from app.services import openf1
import httpx

router = APIRouter(prefix="/data", tags=["data"])


@router.post("/fetch", response_model=DataFetchResponse)
async def fetch_data(request: DataFetchRequest):
    context = await fetch_race_context(
        session_key=request.session_key,
        drivers=request.drivers,
    )
    return DataFetchResponse(race_context=context)


@router.get("/drivers", response_model=DriversResponse)
async def get_drivers(session_key: str | None = None):
    async with httpx.AsyncClient() as client:
        if not session_key:
            session = await openf1.fetch_latest_session(client)
            if not session:
                return DriversResponse(session_key="", drivers=[])
            session_key = str(session["session_key"])

        raw_drivers = await openf1.fetch_drivers(client, session_key)

    drivers = [
        Driver(
            driver_number=d["driver_number"],
            name=d.get("full_name", ""),
            code=d.get("name_acronym", ""),
            team=d.get("team_name", ""),
        )
        for d in raw_drivers
    ]
    return DriversResponse(session_key=session_key, drivers=drivers)
