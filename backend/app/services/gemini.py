import asyncio
import logging
from google import genai
from app.config import settings

logger = logging.getLogger(__name__)

_client: genai.Client | None = None

MAX_RETRIES = 3
RETRY_BASE_DELAY = 15.0


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def generate_strategy(system_prompt: str, user_message: str) -> str:
    client = _get_client()
    logger.info("Gemini request: model=%s, system_prompt=%d chars, user_message=%d chars",
                 settings.gemini_model, len(system_prompt), len(user_message))

    for attempt in range(MAX_RETRIES):
        try:
            response = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=user_message,
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.7,
                    max_output_tokens=3000,
                ),
            )

            if not response.candidates:
                logger.warning("Gemini returned no candidates. Feedback: %s",
                             getattr(response, "prompt_feedback", "unknown"))
                return ""

            text = response.text or ""
            if not text:
                candidate = response.candidates[0]
                logger.warning("Gemini returned empty text. Finish reason: %s, safety: %s",
                             getattr(candidate, "finish_reason", "unknown"),
                             getattr(candidate, "safety_ratings", "none"))
            return text

        except Exception as e:
            error_str = str(e)
            is_rate_limit = "429" in error_str or "RESOURCE_EXHAUSTED" in error_str

            if is_rate_limit and attempt < MAX_RETRIES - 1:
                wait_time = RETRY_BASE_DELAY * (2 ** attempt)
                logger.warning("Gemini rate limited, retrying in %.1fs (attempt %d/%d)",
                             wait_time, attempt + 1, MAX_RETRIES)
                await asyncio.sleep(wait_time)
                continue

            if is_rate_limit:
                logger.warning("Gemini rate limit exhausted after %d retries", MAX_RETRIES)
                raise GeminiRateLimitError("Gemini API rate limit reached — please wait a minute and try again.")

            logger.error("Gemini call failed: %s: %s", type(e).__name__, e)
            return ""

    return ""


class GeminiRateLimitError(Exception):
    pass
