import main
import pytest
from unittest.mock import MagicMock, patch, AsyncMock

request_mock = MagicMock()
request_mock.url_for.return_value = "localhost/api/auth"

oauth_mock = MagicMock()
oauth_mock.google.authorize_redirect = AsyncMock(
    return_value = "成功"
)

@pytest.mark.asyncio
async def test_login():
    with (
            patch("main.oauth", oauth_mock)
    ):
        result = await main.login(request_mock)
        assert result == "成功"

