import main
import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock, patch, AsyncMock
from authlib.integrations.base_client.errors import OAuthError
from joserfc.errors import JoseError

oautherror_token_mock = MagicMock()
oautherror_token_mock.google.authorize_access_token = AsyncMock(
    side_effect=OAuthError(
        error="invalid_grant",
        description="error content"
    )
)

joseerror_token_mock = MagicMock()
joseerror_token_mock.google.authorize_access_token = AsyncMock(
    side_effect=JoseError(description="error content")
)
token_mock = MagicMock()
token_mock.google.authorize_access_token = AsyncMock(
    return_value={
        "access_token": "ac",
        "refresh_token": "r",
        "scope": "s",
        "id_token": "id",
        "token_type": "Bearer",
        "expires_in": 1,
        "userinfo":{
            "sub": 1,
            "iss": "a",
            "aud": main.CLIENT_ID
        }
    }
)

no_sub_token_mock = MagicMock()
no_sub_token_mock.google.authorize_access_token = AsyncMock(
    return_value={
        "access_token": "ac",
        "refresh_token": "r",
        "scope": "s",
        "id_token": "id",
        "token_type": "Bearer",
        "expires_in": 1,
        "userinfo":{
            "sub": None,
            "iss": "a",
            "aud": main.CLIENT_ID
        }
    }
)

no_uinfo_token_mock = MagicMock()
no_uinfo_token_mock.google.authorize_access_token = AsyncMock(
    return_value={
        "access_token": "ac",
        "refresh_token": "r",
        "scope": "s",
        "id_token": "id",
        "token_type": "Bearer",
        "expires_in": 1,
        "userinfo": None
    }
)

bad_aud_token_mock = MagicMock()
bad_aud_token_mock.google.authorize_access_token = AsyncMock(
    return_value={
        "access_token": "ac",
        "refresh_token": "r",
        "scope": "s",
        "id_token": "id",
        "token_type": "Bearer",
        "expires_in": 1,
        "userinfo":{
            "sub": 1,
            "iss": "a",
            "aud": "bad_aud"
        }
    }
)

no_aud_token_mock = MagicMock()
no_aud_token_mock.google.authorize_access_token = AsyncMock(
    return_value={
        "access_token": "ac",
        "refresh_token": "r",
        "scope": "s",
        "id_token": "id",
        "token_type": "Bearer",
        "expires_in": 1,
        "userinfo":{
            "sub": 1,
            "iss": "a",
            "aud": None
        }
    }
)

log_mock = MagicMock()
log_mock.logger.return_value = None

request_user_log_mock = MagicMock


db_mock = MagicMock()
db_mock.add.return_value = None
db_mock.commit.return_value = None

request_mock = MagicMock()
request_mock.session = {}

@pytest.fixture(autouse=True)
def reset_session():
    request_mock.session = {}

    for mock in (
        oautherror_token_mock,
        joseerror_token_mock,
        token_mock,
        no_sub_token_mock,
        no_uinfo_token_mock,
        log_mock,
        db_mock,
        request_mock,
    ):
        mock.reset_mock()

def identify_true_user_mock(sub, db):
    user_mock = MagicMock()
    user_mock.uid = 10
    user_mock.is_allowed = True
    return user_mock

def identify_false_user_mock(sub, db):
    user_mock = MagicMock()
    user_mock.uid = 10
    user_mock.is_allowed = False
    return user_mock

def identify_no_user_mock(sub, db):
    return 

def RedirectResponse_mock(url):
    return url


#リクエスト失敗
@pytest.mark.asyncio
async def test_request_failed_auth():
    with (
            patch("main.oauth",oautherror_token_mock),
            patch("main.logger", log_mock)
    ):
        with pytest.raises(HTTPException) as e:
            await main.auth(None, db_mock)
        assert (e.value.status_code, e.value.detail) == (
    400,
    "認証に失敗しました"
)

#IDトークン検証エラー
@pytest.mark.asyncio
async def test_idtoken_failed_auth():
    with (
            patch("main.oauth",joseerror_token_mock),
            patch("main.logger", log_mock)
    ):
        with pytest.raises(HTTPException) as e:
            await main.auth(None, db_mock)
        assert (e.value.status_code, e.value.detail) == (
    401,
    "IDトークンの検証に失敗しました"
)

#認証成功
@pytest.mark.asyncio
async def test_all_true_auth(monkeypatch):

    monkeypatch.setattr(
        main,'identify_user',identify_true_user_mock
    )

    monkeypatch.setattr(
        main,'RedirectResponse',RedirectResponse_mock
    )


    with (
            patch("main.oauth",token_mock),
            patch("main.logger", log_mock)
    ):
        result = await main.auth(request_mock, db_mock)
        assert result == f"{main.FRONTEND_URL}/?auth_result=allowed"
        assert request_mock.session == {"uid": 10}
#認証失敗
@pytest.mark.asyncio
async def test_all_false_auth(monkeypatch):

    monkeypatch.setattr(
        main,'identify_user',identify_false_user_mock
    )

    monkeypatch.setattr(
        main,'RedirectResponse',RedirectResponse_mock
    )


    with (
            patch("main.oauth",token_mock),
            patch("main.logger", log_mock)
    ):
        result = await main.auth(request_mock, db_mock)
        assert result == f"{main.FRONTEND_URL}/?auth_result=denied"

#認識リクエスト
@pytest.mark.asyncio
async def test_request_auth(monkeypatch):

    user_mock = MagicMock()
    user_mock.uid = 10
    user_mock.is_allowed = True

    identify_mock = MagicMock(
        side_effect=[None, user_mock]
    )
    monkeypatch.setattr(
        main,'RedirectResponse',RedirectResponse_mock
    )
    monkeypatch.setattr(
        main, 'identify_user', identify_mock
    )

    with (
            patch("main.oauth",token_mock),
            patch("main.logger", log_mock)
    ):
        result = await main.auth(request_mock, db_mock)
        assert result == f"{main.FRONTEND_URL}/?auth_result=requested"


# sub取得失敗
@pytest.mark.asyncio
async def test_no_sub_auth(monkeypatch):

    monkeypatch.setattr(
        main,'identify_user',identify_false_user_mock
    )

    monkeypatch.setattr(
        main,'RedirectResponse',RedirectResponse_mock
    )


    with (
            patch("main.oauth",no_sub_token_mock),
            patch("main.logger", log_mock)
    ):
        result = await main.auth(request_mock, db_mock)
        assert result == f"{main.FRONTEND_URL}/?auth_result=data_failed"

# Googleユーザー取得失敗
@pytest.mark.asyncio
async def test_google_failed_auth(monkeypatch):

    monkeypatch.setattr(
        main,'identify_user',identify_false_user_mock
    )

    monkeypatch.setattr(
        main,'RedirectResponse',RedirectResponse_mock
    )


    with (
            patch("main.oauth",no_uinfo_token_mock),
            patch("main.logger", log_mock)
    ):
        result = await main.auth(request_mock, db_mock)
        assert result == f"{main.FRONTEND_URL}/?auth_result=google_request_failed"

# 別クライアントエラー
@pytest.mark.asyncio
async def test_bad_aud_auth():
    with (
            patch("main.oauth",bad_aud_token_mock),
            patch("main.logger", log_mock)
    ):
        with pytest.raises(HTTPException) as e:
            await main.auth(request_mock, db_mock)
        assert (e.value.status_code, e.value.detail) == (
    401,
    "別クライアントへのIDトークンです"
)

# aud取得失敗エラー
@pytest.mark.asyncio
async def test_bad_aud_auth():
    with (
            patch("main.oauth",no_aud_token_mock),
            patch("main.logger", log_mock)
    ):
        with pytest.raises(HTTPException) as e:
            await main.auth(request_mock, db_mock)
        assert (e.value.status_code, e.value.detail) == (
    401,
    "別クライアントへのIDトークンです"
)