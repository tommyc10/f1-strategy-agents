import logging
from datetime import datetime, timezone
from httpx import AsyncClient
from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = settings.openf1_base_url


async def _get(client: AsyncClient, endpoint: str, params: dict | None = None) -> list:
    import asyncio

    # Retry logic for rate limiting (429)
    max_retries = 3
    retry_delay = 1.0

    for attempt in range(max_retries):
        try:
            response = await client.get(f"{BASE_URL}/{endpoint}", params=params or {})

            # Handle rate limiting with exponential backoff
            if response.status_code == 429:
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning("OpenF1 %s rate limited, retrying in %.1fs (attempt %d/%d)",
                                 endpoint, wait_time, attempt + 1, max_retries)
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    logger.warning("OpenF1 %s rate limited, max retries exceeded", endpoint)
                    return []

            if response.status_code != 200:
                logger.warning("OpenF1 %s returned %d", endpoint, response.status_code)
                return []

            data = response.json()
            if not isinstance(data, list):
                return []
            return data
        except Exception as e:
            logger.error("OpenF1 %s failed: %s", endpoint, e)
            return []

    return []


async def fetch_latest_session(client: AsyncClient) -> dict | None:
    results = await _get(client, "sessions", {"session_type": "Race"})
    if not results:
        return None
    now = datetime.now(timezone.utc).isoformat()
    past = [s for s in results if s.get("date_start", "") <= now]
    return past[-1] if past else results[-1]


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


async def fetch_race_control(client: AsyncClient, session_key: str) -> list:
    return await _get(client, "race_control", {"session_key": session_key})


