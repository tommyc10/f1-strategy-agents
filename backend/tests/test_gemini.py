import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.gemini import generate_strategy


async def test_generate_strategy_returns_text():
    mock_response = MagicMock()
    mock_response.text = "Based on the data, Norris should pit now."

    mock_client = MagicMock()
    mock_client.models.generate_content_async = AsyncMock(return_value=mock_response)

    with patch("app.services.gemini._get_client", return_value=mock_client):
        result = await generate_strategy(
            system_prompt="You are an F1 strategist.",
            user_message="Should Norris pit?",
        )
        assert result == "Based on the data, Norris should pit now."


async def test_generate_strategy_returns_empty_on_error():
    mock_client = MagicMock()
    mock_client.models.generate_content_async = AsyncMock(side_effect=Exception("API error"))

    with patch("app.services.gemini._get_client", return_value=mock_client):
        result = await generate_strategy(
            system_prompt="You are an F1 strategist.",
            user_message="Should Norris pit?",
        )
        assert result == ""
