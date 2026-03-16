import logging
from google import genai
from app.config import settings

logger = logging.getLogger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def generate_strategy(system_prompt: str, user_message: str) -> str:
    try:
        response = await _get_client().aio.models.generate_content(
            model=settings.gemini_model,
            contents=user_message,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                max_output_tokens=2048,
            ),
        )
        return response.text or ""
    except Exception as e:
        logger.error("Gemini call failed: %s", e)
        return ""
