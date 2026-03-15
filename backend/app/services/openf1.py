import logging
from httpx import AsyncClient
from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = settings.openf1_base_url


async def _get(client: AsyncClient, endpoint: str, params: dict | None = None) -> list:
    try:
        response = await client.get(f"{BASE_URL}/{endpoint}", params=params or {})
        if response.status_code != 200:
            logger.warning("OpenF1 %s returned %d", endpoint, response.status_code)
            return []
        return response.json()
    except Exception as e:
        logger.error("OpenF1 %s failed: %s", endpoint, e)
        return []


async def fetch_latest_session(client: AsyncClient) -> dict | None:
    results = await _get(client, "sessions", {"session_type": "Race"})
    return results[-1] if results else None


async def fetch_positions(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "position", {"session_key": session_key})


async def fetch_drivers(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "drivers", {"session_key": session_key})


async def fetch_stints(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "stints", {"session_key": session_key})


async def fetch_laps(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "laps", {"session_key": session_key})


async def fetch_weather(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "weather", {"session_key": session_key})


async def fetch_intervals(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "intervals", {"session_key": session_key})
