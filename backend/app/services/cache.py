import logging
import time

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[float, object]] = {}
TTL_SECONDS = 300  # 5 minutes


def get(key: str) -> object | None:
    entry = _cache.get(key)
    if entry is None:
        return None
    timestamp, value = entry
    if time.monotonic() - timestamp > TTL_SECONDS:
        del _cache[key]
        return None
    logger.info("Cache hit: %s", key)
    return value


def put(key: str, value: object) -> None:
    _cache[key] = (time.monotonic(), value)
    logger.info("Cache set: %s", key)
