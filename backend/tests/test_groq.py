import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.groq import generate_strategy


async def test_generate_strategy_returns_text():
    """Test that streaming chunks are assembled into full text."""
    async def mock_stream(*args, **kwargs):
        # Simulate SSE response
        lines = [
            'data: {"choices":[{"delta":{"content":"Based on"}}]}',
            'data: {"choices":[{"delta":{"content":" the data."}}]}',
            "data: [DONE]",
        ]
        response = AsyncMock()
        response.status_code = 200
        response.aiter_lines = _make_aiter(lines)

        yield response

    # We need to mock the httpx client stream context manager
    with patch("app.services.groq.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        # Build a mock streaming response
        mock_response = AsyncMock()
        mock_response.status_code = 200

        lines = [
            'data: {"choices":[{"delta":{"content":"Based on"}}]}',
            'data: {"choices":[{"delta":{"content":" the data."}}]}',
            "data: [DONE]",
        ]
        mock_response.aiter_lines = _make_aiter(lines)

        mock_client.stream = MagicMock(return_value=_AsyncCtx(mock_response))

        result = await generate_strategy("system", "user")
        assert result == "Based on the data."


async def test_generate_strategy_returns_empty_on_error():
    with patch("app.services.groq.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        mock_response = AsyncMock()
        mock_response.status_code = 500
        mock_response.aread = AsyncMock(return_value=b"Internal Server Error")

        mock_client.stream = MagicMock(return_value=_AsyncCtx(mock_response))

        result = await generate_strategy("system", "user")
        assert result == ""


def _make_aiter(lines):
    async def aiter():
        for line in lines:
            yield line
    return aiter


class _AsyncCtx:
    def __init__(self, response):
        self.response = response

    async def __aenter__(self):
        return self.response

    async def __aexit__(self, *args):
        pass
