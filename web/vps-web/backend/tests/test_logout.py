import main
from unittest.mock import MagicMock, patch, AsyncMock


request_mock = MagicMock()
request_mock.session = {"uid": 1}

def RedirectResponse_mock(url):
    return url

def test_logout(monkeypatch):
    
    monkeypatch.setattr(
        main,"RedirectResponse",RedirectResponse_mock
    )

    result = main.logout(request_mock)
    assert result == f"{main.FRONTEND_URL}/?status=logouted"
    assert request_mock.session == {}