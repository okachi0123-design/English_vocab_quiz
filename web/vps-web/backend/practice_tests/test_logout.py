import main
from unittest.mock import MagicMock, patch


request_mock = MagicMock()
request_mock.session = {"uid": 1}

def RedirectResponse_mock(url):
    return url

def login_checker_mock():
    return

def origin_checker_mock():
    return

def test_logout(monkeypatch):

    monkeypatch.setattr(
        main,"login_checker",login_checker_mock
    )

    monkeypatch.setattr(
        main,"origin_checker",origin_checker_mock
    )
    
    monkeypatch.setattr(
        main,"RedirectResponse",RedirectResponse_mock
    )

    result = main.logout(request_mock)
    assert result == f"{main.FRONTEND_URL}/?status=logouted"
    assert request_mock.session == {}