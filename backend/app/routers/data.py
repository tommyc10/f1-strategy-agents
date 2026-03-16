from fastapi import APIRouter
from app.models.schemas import DataFetchRequest, DataFetchResponse, DriversResponse, Driver
from app.agents.data_agent import fetch_race_context
from app.services import openf1, cache
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
    cache_key = f"sessions:{year or 'all'}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        params = {"session_type": "Race"}
        if year:
            params["year"] = year
        results = await openf1._get(client, "sessions", params)

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        past = [s for s in results if s.get("date_start", "") <= now]

        sessions = [
            {
                "session_key": str(s["session_key"]),
                "date": s.get("date_start", "")[:10],
                "location": s.get("location", ""),
                "country": s.get("country_name", ""),
                "year": s.get("year", 0),
            }
            for s in reversed(past)  # most recent first
        ]

    cache.put(cache_key, sessions)
    return sessions


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


@router.get("/suggestions")
async def get_suggestions(session_key: str):
    context = await fetch_race_context(session_key=session_key)
    suggestions = []

    # Winner analysis
    if context.positions:
        winner = context.positions[0].driver
        suggestions.append(f"How did {winner} win this race?")

    # Close battle
    for i in range(len(context.positions) - 1):
        curr_gap = context.positions[i].gap_to_leader
        next_gap = context.positions[i + 1].gap_to_leader
        gap = next_gap - curr_gap
        if 0 < gap < 2.0:
            a = context.positions[i].driver
            b = context.positions[i + 1].driver
            suggestions.append(f"Was the battle between {a} and {b} decided by pit strategy?")
            break

    # Multi-stop
    stints_by_driver: dict[str, list] = {}
    for s in context.stints:
        stints_by_driver.setdefault(s.driver, []).append(s)
    multi_stop = [d for d, ss in stints_by_driver.items() if len(ss) >= 3]
    if multi_stop:
        suggestions.append(f"Did {multi_stop[0]}'s multi-stop strategy work?")

    # Tyre compound variety
    if context.stints:
        compounds_used = set(s.compound.value for s in context.stints)
        if len(compounds_used) >= 3:
            suggestions.append("Which tyre compound worked best in this race?")

    return suggestions[:4]


@router.get("/race-events")
async def get_race_events(session_key: str):
    cache_key = f"race_events:{session_key}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        raw = await openf1.fetch_race_control(client, session_key)

    events = []
    for msg in raw:
        category = msg.get("category", "")
        if category in ("SafetyCar", "Flag", "Drs"):
            events.append({
                "lap": msg.get("lap_number", 0),
                "category": category,
                "flag": msg.get("flag", ""),
                "message": msg.get("message", ""),
            })

    cache.put(cache_key, events)
    return events


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
            "lap_start": stint.lap_start,
        })

    return {
        "session_key": context.session_key,
        "positions": [p.model_dump() for p in context.positions],
        "strategy_map": strategy_map,
        "weather": context.weather.model_dump() if context.weather else None,
        "sectors": [s.model_dump() for s in context.sectors],
        "laps": [l.model_dump() for l in context.laps],
        "total_drivers": len(context.positions),
    }
