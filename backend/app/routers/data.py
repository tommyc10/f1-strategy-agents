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


@router.get("/sessions")
async def list_sessions(year: int | None = None):
    async with httpx.AsyncClient() as client:
        params = {"session_type": "Race"}
        if year:
            params["year"] = year
        results = await openf1._get(client, "sessions", params)

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        past = [s for s in results if s.get("date_start", "") <= now]

        return [
            {
                "session_key": str(s["session_key"]),
                "date": s.get("date_start", "")[:10],
                "location": s.get("location", ""),
                "country": s.get("country_name", ""),
                "year": s.get("year", 0),
            }
            for s in reversed(past)  # most recent first
        ]


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


@router.get("/race-summary")
async def race_summary(session_key: str):
    context = await fetch_race_context(session_key=session_key)

    # Group stints by driver for strategy visualization
    strategy_map: dict[str, list[dict]] = {}
    for stint in context.stints:
        if stint.driver not in strategy_map:
            strategy_map[stint.driver] = []
        strategy_map[stint.driver].append({
            "stint_number": stint.stint_number,
            "compound": stint.compound.value,
            "tyre_age": stint.tyre_age,
        })

    return {
        "session_key": context.session_key,
        "positions": [p.model_dump() for p in context.positions],
        "strategy_map": strategy_map,
        "weather": context.weather.model_dump() if context.weather else None,
        "total_drivers": len(context.positions),
    }
