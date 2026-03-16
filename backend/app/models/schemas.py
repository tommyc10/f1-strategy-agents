from pydantic import BaseModel
from app.models.types import TyreCompound, Recommendation, Confidence


# --- Data Agent ---

class DriverPosition(BaseModel):
    driver: str
    position: int
    gap_to_leader: float


class TyreStint(BaseModel):
    driver: str
    compound: TyreCompound
    tyre_age: int
    stint_number: int
    lap_start: int = 0
    lap_end: int = 0


class LapTime(BaseModel):
    driver: str
    lap_number: int
    lap_time: float


class SectorTime(BaseModel):
    driver: str
    lap_number: int
    sector_number: int  # 1, 2, or 3
    sector_time: float


class Weather(BaseModel):
    track_temp: float
    air_temp: float
    rain_risk: int


class RaceContext(BaseModel):
    session_key: str
    positions: list[DriverPosition]
    stints: list[TyreStint]
    laps: list[LapTime]
    sectors: list[SectorTime] = []
    weather: Weather | None


class DataFetchRequest(BaseModel):
    session_key: str | None = None
    drivers: list[str] | None = None
    metrics: list[str] | None = None


class DataFetchResponse(BaseModel):
    race_context: RaceContext


# --- Strategy Agent ---

class StrategyRequest(BaseModel):
    question: str
    race_context: RaceContext


class StrategyOutput(BaseModel):
    reasoning: str
    recommendation: Recommendation
    confidence: Confidence


class StrategyResponse(BaseModel):
    strategy_output: StrategyOutput


# --- Summariser Agent ---

class SummariserRequest(BaseModel):
    strategy_output: StrategyOutput
    race_context: RaceContext


class SummariserResponse(BaseModel):
    briefing: str


# --- Orchestrator ---

class OrchestratorRequest(BaseModel):
    question: str
    session_key: str | None = None
    is_historical: bool = False


class OrchestratorResponse(BaseModel):
    briefing: str
    strategy_reasoning: str
    race_context: RaceContext


# --- Drivers ---

class Driver(BaseModel):
    driver_number: int
    name: str
    code: str
    team: str


class DriversResponse(BaseModel):
    session_key: str
    drivers: list[Driver]
