import main
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException

request_mock = MagicMock()
request_mock.session.get.return_value = 1

request_no_uid_mock = MagicMock()
request_no_uid_mock.session.get.return_value = None

db_true_mock = MagicMock()
db_true_mock.query.return_value.filter.return_value.scalar.return_value = True

db_false_mock = MagicMock()
db_false_mock.query.return_value.filter.return_value.scalar.return_value = False

db_null_mock = MagicMock()
db_null_mock.query.return_value.filter.return_value.scalar.return_value = None

def test_no_uid_login_checker():
    with pytest.raises(HTTPException) as e:
        main.login_checker(request_no_uid_mock,None)
    assert (e.value.status_code, e.value.detail) == (
                401,
                "ログインしてください"
                )


def test_true_login_checker():
    result = main.login_checker(request_mock,db_true_mock)
    assert result == None

def test_false_login_checker():
    with pytest.raises(HTTPException) as e:
        main.login_checker(request_mock,db_false_mock)
    assert (e.value.status_code, e.value.detail) == (
                403,
                "認証が許可されていません"
                )
            
def test_only_session_uid_login_checker():
    with pytest.raises(HTTPException) as e:
        main.login_checker(request_mock,db_null_mock)
    assert (e.value.status_code, e.value.detail) == (
                401,
                "ユーザー情報が登録されていません"
                )
