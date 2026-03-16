import logging
import httpx
from app.services import openf1
from app.services import cache
from app.models.schemas import (
    RaceContext, DriverPosition, TyreStint, LapTime, Weather, SectorTime,
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

    # Take the last position entry for each driver (final classification)
    final_positions = {}
    for p in raw_positions:
        num = p["driver_number"]
        if num in driver_lookup:
            final_positions[num] = p

    # Sort by final position and build result
    positions = []
    for num in sorted(final_positions.keys(), key=lambda n: final_positions[n].get("position", 999)):
        p = final_positions[num]
        positions.append(DriverPosition(
            driver=driver_lookup[num],
            position=p.get("position", 999),
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
            lap_start=lap_start,
            lap_end=lap_end,
        ))
    return stints


def _parse_laps(raw_laps: list, driver_lookup: dict[int, str]) -> list[LapTime]:
    laps = []
    for lap in raw_laps:
        num = lap["driver_number"]
        if num not in driver_lookup or lap.get("lap_duration") is None:
            continue
        # OpenF1 returns lap_duration in milliseconds; convert to seconds
        lap_duration_ms = lap["lap_duration"]
        lap_duration_s = lap_duration_ms / 1000.0 if lap_duration_ms > 10 else lap_duration_ms
        laps.append(LapTime(
            driver=driver_lookup[num],
            lap_number=lap["lap_number"],
            lap_time=lap_duration_s,
        ))
    return laps


def _parse_sectors(raw_laps: list, driver_lookup: dict[int, str]) -> list[SectorTime]:
    """Extract sector times from laps data (duration_sector_1/2/3 fields)."""
    sectors = []
    for lap in raw_laps:
        num = lap.get("driver_number")
        if num not in driver_lookup:
            continue
        lap_number = lap.get("lap_number", 0)
        for sector_num in (1, 2, 3):
            duration = lap.get(f"duration_sector_{sector_num}")
            if duration is not None:
                sectors.append(SectorTime(
                    driver=driver_lookup[num],
                    lap_number=lap_number,
                    sector_number=sector_num,
                    sector_time=float(duration),
                ))
    return sectors


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


def _filter_context_by_drivers(context: RaceContext, driver_codes: set[str]) -> RaceContext:
    return RaceContext(
        session_key=context.session_key,
        positions=[p for p in context.positions if p.driver in driver_codes],
        stints=[s for s in context.stints if s.driver in driver_codes],
        laps=[l for l in context.laps if l.driver in driver_codes],
        sectors=[s for s in context.sectors if s.driver in driver_codes],
        weather=context.weather,
    )


async def fetch_race_context(
    session_key: str | None = None,
    drivers: list[str] | None = None,
) -> RaceContext:
    import asyncio

    async with httpx.AsyncClient() as client:
        if not session_key:
            session = await openf1.fetch_latest_session(client)
            if not session:
                return _empty_context()
            session_key = str(session["session_key"])

        cache_key = f"race_context:{session_key}"
        cached = cache.get(cache_key)
        if cached is not None:
            context = cached
            if drivers:
                return _filter_context_by_drivers(context, set(drivers))
            return context

        raw_drivers = await openf1.fetch_drivers(client, session_key)
        driver_lookup = _build_driver_lookup(raw_drivers)

        # Fetch remaining data sequentially with small delays to respect rate limits
        raw_positions = await openf1.fetch_positions(client, session_key)
        await asyncio.sleep(0.3)  # 300ms delay between requests

        raw_intervals = await openf1.fetch_intervals(client, session_key)
        await asyncio.sleep(0.3)

        raw_stints = await openf1.fetch_stints(client, session_key)
        await asyncio.sleep(0.3)

        raw_laps = await openf1.fetch_laps(client, session_key)
        await asyncio.sleep(0.3)

        raw_weather = await openf1.fetch_weather(client, session_key)

        context = RaceContext(
            session_key=session_key,
            positions=_parse_positions(raw_positions, raw_intervals, driver_lookup),
            stints=_parse_stints(raw_stints, driver_lookup),
            laps=_parse_laps(raw_laps, driver_lookup),
            sectors=_parse_sectors(raw_laps, driver_lookup),
            weather=_parse_weather(raw_weather),
        )

        cache.put(cache_key, context)

        if drivers:
            return _filter_context_by_drivers(context, set(drivers))
        return context
