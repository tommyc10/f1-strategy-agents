import asyncio
import logging
import fastf1
from pathlib import Path

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent.parent.parent / ".fastf1_cache"
CACHE_DIR.mkdir(exist_ok=True)
fastf1.Cache.enable_cache(str(CACHE_DIR))


def _load_session(year: int, location: str):
    session = fastf1.get_session(year, location, "R")
    session.load(telemetry=False, messages=False)
    return session


async def get_race_results(year: int, location: str) -> list[dict]:
    """Get final race classification."""
    try:
        session = await asyncio.to_thread(_load_session, year, location)
        results = session.results
        return [
            {
                "position": int(row["Position"]),
                "driver": row["Abbreviation"],
                "team": row["TeamName"],
                "status": row["Status"],
                "points": float(row["Points"]),
            }
            for _, row in results.iterrows()
            if row["Position"] > 0
        ]
    except Exception as e:
        logger.error("FastF1 error: %s", e)
        return []


async def get_lap_analysis(year: int, location: str, driver: str) -> dict:
    """Get lap time analysis for a specific driver."""
    try:
        session = await asyncio.to_thread(_load_session, year, location)
        laps = session.laps.pick_drivers(driver)

        if laps.empty:
            return {"driver": driver, "laps": []}

        lap_data = []
        for _, lap in laps.iterrows():
            lt = lap["LapTime"]
            if lt is not None and hasattr(lt, "total_seconds"):
                lap_data.append({
                    "lap_number": int(lap["LapNumber"]),
                    "lap_time": round(lt.total_seconds(), 3),
                    "compound": str(lap.get("Compound", "UNKNOWN")),
                    "tyre_life": int(lap.get("TyreLife", 0)),
                })

        return {"driver": driver, "laps": lap_data}
    except Exception as e:
        logger.error("FastF1 lap analysis error: %s", e)
        return {"driver": driver, "laps": []}
