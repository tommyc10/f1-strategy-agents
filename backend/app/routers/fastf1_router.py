from fastapi import APIRouter
from app.services.fastf1_service import get_race_results, get_lap_analysis

router = APIRouter(prefix="/fastf1", tags=["fastf1"])


@router.get("/results")
async def race_results(year: int, location: str):
    return await get_race_results(year, location)


@router.get("/laps")
async def lap_analysis(year: int, location: str, driver: str):
    return await get_lap_analysis(year, location, driver)
