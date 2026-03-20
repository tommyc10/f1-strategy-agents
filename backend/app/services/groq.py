import asyncio
import logging
from collections.abc import AsyncGenerator
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_RETRIES = 3
RETRY_BASE_DELAY = 5.0


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }


def _body(system_prompt: str, user_message: str, stream: bool = False) -> dict:
    return {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.7,
        "max_tokens": 3000,
        "stream": stream,
    }


async def generate_strategy(system_prompt: str, user_message: str) -> str:
    """Non-streaming: returns full response text."""
    chunks = []
    async for chunk in generate_strategy_stream(system_prompt, user_message):
        chunks.append(chunk)
    return "".join(chunks)


async def generate_strategy_stream(system_prompt: str, user_message: str) -> AsyncGenerator[str, None]:
    """Streaming: yields text chunks as Groq generates them."""
    logger.info("Groq stream request: model=%s, system_prompt=%d chars, user_message=%d chars",
                settings.groq_model, len(system_prompt), len(user_message))

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    BASE_URL,
                    headers=_headers(),
                    json=_body(system_prompt, user_message, stream=True),
                    timeout=60.0,
                ) as response:
                    if response.status_code == 429:
                        raise RateLimitError("429")

                    if response.status_code != 200:
                        body = await response.aread()
                        logger.error("Groq error %d: %s", response.status_code, body[:500])
                        return

                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            return

                        import json
                        try:
                            chunk = json.loads(data)
                        except json.JSONDecodeError:
                            continue

                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        text = delta.get("content", "")
                        if text:
                            yield text
            return

        except RateLimitError:
            if attempt < MAX_RETRIES - 1:
                wait_time = RETRY_BASE_DELAY * (2 ** attempt)
                logger.warning("Groq rate limited, retrying in %.1fs (attempt %d/%d)",
                             wait_time, attempt + 1, MAX_RETRIES)
                await asyncio.sleep(wait_time)
                continue

            logger.warning("Groq rate limit exhausted after %d retries", MAX_RETRIES)
            raise GroqRateLimitError("Groq API rate limit reached — please wait a minute and try again.")

        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "rate" in error_str.lower():
                if attempt < MAX_RETRIES - 1:
                    wait_time = RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning("Groq rate limited, retrying in %.1fs (attempt %d/%d)",
                                 wait_time, attempt + 1, MAX_RETRIES)
                    await asyncio.sleep(wait_time)
                    continue
                raise GroqRateLimitError("Groq API rate limit reached — please wait a minute and try again.")

            logger.error("Groq call failed: %s: %s", type(e).__name__, e)
            return


class RateLimitError(Exception):
    pass


class GroqRateLimitError(Exception):
    pass
