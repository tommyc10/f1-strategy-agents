import logging
import httpx
from app.services import openf1
from app.models.schemas import (
    RaceContext, DriverPosition, TyreStint, LapTime, Weather,
)
from app.models.types import TyreCompound

logger = logging.getLogger(__name__)


def _build_driver_lookup(raw_drivers: list) -> dict[int, str]:
    return {d["driver_number"]: d["name_acronym"] for d in raw_drivers}


def _safe_gap(value: object) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0


def _parse_positions(raw_positions: list, raw_intervals: list, driver_lookup: dict[int, str]) -> list[DriverPosition]:
    gap_map = {item["driver_number"]: _safe_gap(item.get("gap_to_leader", 0.0)) for item in raw_intervals}
    seen = set()
    positions = []
    for p in sorted(raw_positions, key=lambda x: x["position"]):
        num = p["driver_number"]
        if num in seen or num not in driver_lookup:
            continue
        seen.add(num)
        positions.append(DriverPosition(
            driver=driver_lookup[num],
            position=p["position"],
            gap_to_leader=gap_map.get(num, 0.0),
        ))
    return positions


def _parse_stints(raw_stints: list, driver_lookup: dict[int, str]) -> list[TyreStint]:
    stints = []
    for s in raw_stints:
        num = s["driver_number"]
        if num not in driver_lookup:
            continue
        compound = s.get("compound", "UNKNOWN")
        if compound not in TyreCompound.__members__:
            continue
        lap_end = s.get("lap_end") or s.get("lap_start", 0)
        lap_start = s.get("lap_start", 0)
        stints.append(TyreStint(
            driver=driver_lookup[num],
            compound=TyreCompound(compound),
            tyre_age=lap_end - lap_start,
            stint_number=s.get("stint_number", 1),
        ))
    return stints


def _parse_laps(raw_laps: list, driver_lookup: dict[int, str]) -> list[LapTime]:
    laps = []
    for lap in raw_laps:
        num = lap["driver_number"]
        if num not in driver_lookup or lap.get("lap_duration") is None:
            continue
        laps.append(LapTime(
            driver=driver_lookup[num],
            lap_number=lap["lap_number"],
            lap_time=lap["lap_duration"],
        ))
    return laps


def _parse_weather(raw_weather: list) -> Weather | None:
    if not raw_weather:
        return None
    w = raw_weather[-1]
    return Weather(
        track_temp=w.get("track_temperature", 0.0),
        air_temp=w.get("air_temperature", 0.0),
        rain_risk=int(w.get("rainfall", 0) > 0) * 100,
    )


def _empty_context() -> RaceContext:
    return RaceContext(
        session_key="",
        positions=[],
        stints=[],
        laps=[],
        weather=None,
    )


async def fetch_race_context(
    session_key: str | None = None,
    drivers: list[str] | None = None,
) -> RaceContext:
    async with httpx.AsyncClient() as client:
        if not session_key:
            session = await openf1.fetch_latest_session(client)
            if not session:
                return _empty_context()
            session_key = str(session["session_key"])

        raw_drivers = await openf1.fetch_drivers(client, session_key)
        driver_lookup = _build_driver_lookup(raw_drivers)

        if drivers:
            driver_codes = set(drivers)
            driver_lookup = {k: v for k, v in driver_lookup.items() if v in driver_codes}

        raw_positions = await openf1.fetch_positions(client, session_key)
        raw_intervals = await openf1.fetch_intervals(client, session_key)
        raw_stints = await openf1.fetch_stints(client, session_key)
        raw_laps = await openf1.fetch_laps(client, session_key)
        raw_weather = await openf1.fetch_weather(client, session_key)

        return RaceContext(
            session_key=session_key,
            positions=_parse_positions(raw_positions, raw_intervals, driver_lookup),
            stints=_parse_stints(raw_stints, driver_lookup),
            laps=_parse_laps(raw_laps, driver_lookup),
            weather=_parse_weather(raw_weather),
        )
