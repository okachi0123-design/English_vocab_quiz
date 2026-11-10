import main
from unittest.mock import MagicMock
from fastapi import HTTPException
import pytest

request_origin_mock = MagicMock()
request_origin_mock.headers = {"origin": main.FRONTEND_URL}

request_bad_origin_mock = MagicMock()
request_bad_origin_mock.headers = {"origin": "http://badexample.com"}

request_referer_mock = MagicMock()
request_referer_mock.headers = {"referer": f"{main.FRONTEND_URL}/quiz/?attempt_count=10"}

request_bad_referer_mock = MagicMock()
request_bad_referer_mock.headers =  {"referer": "http://badexample.com/quiz/?attempt_count=10"}

request_both_mock = MagicMock()
request_both_mock.headers = {"origin": main.FRONTEND_URL, "referer": f"{main.FRONTEND_URL}/quiz/?attempt_count=10"}

request_nothing_mock = MagicMock()
request_nothing_mock.headers = {}

request_only_reftrue_mock = MagicMock()
request_only_reftrue_mock.headers = {"origin": "http://badexample.com", "referer": f"{main.FRONTEND_URL}/quiz/?attempt_count=10"}

def test_true_origin_checker():
    result = main.origin_checker(main.FRONTEND_URL, request_origin_mock)
    assert result == None

def test_true_referer_checker():
    result = main.origin_checker(main.FRONTEND_URL, request_referer_mock)
    assert result == None

def test_bad_origin_checker():
    with pytest.raises(HTTPException) as e:
        main.origin_checker(main.FRONTEND_URL, request_bad_origin_mock)
    assert (e.value.status_code, e.value.detail) == (
                403,
                "不正な経路からのアクセスです"
                )

def test_bad_referer_checker():
    with pytest.raises(HTTPException) as e:
        main.origin_checker(main.FRONTEND_URL, request_bad_referer_mock)
    assert (e.value.status_code, e.value.detail) == (
                403,
                "不正な経路からのアクセスです"
                )

def test_both_origin_checker():
    result = main.origin_checker(main.FRONTEND_URL, request_both_mock)
    assert result == None

def test_nothing_origin_checker():
    with pytest.raises(HTTPException) as e:
        main.origin_checker(main.FRONTEND_URL, request_nothing_mock)
    assert (e.value.status_code, e.value.detail) == (
                403,
                "不正な経路からのアクセスです"
                )

def test_only_reftrue_origin_checker():
    with pytest.raises(HTTPException) as e:
        main.origin_checker(main.FRONTEND_URL, request_only_reftrue_mock)
    assert (e.value.status_code, e.value.detail) == (
                403,
                "不正な経路からのアクセスです"
                ) 