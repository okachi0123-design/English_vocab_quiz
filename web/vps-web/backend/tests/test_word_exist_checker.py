import main
from unittest.mock import MagicMock
from fastapi import HTTPException
import pytest
from collections import namedtuple

Row = namedtuple("Row", ["id", "word", "meaning", "uid"])

request_mock = MagicMock()
request_mock.session = {"uid": 10}

db_mock = MagicMock()
db_mock.query.return_value.filter.return_value.first.return_value = Row(1,"cat","ねこ",10)

db_no_words_mock = MagicMock()
db_no_words_mock.query.return_value.filter.return_value.first.return_value = None

def test_word_exist_checker():
    result = main.word_exist_checker(request_mock, db_mock)
    assert result is None

def test_no_word_exist_checker():
    with pytest.raises(HTTPException) as e:
        main.word_exist_checker(request_mock, db_no_words_mock)
    assert (e.value.status_code, e.value.detail) == (
                404,
                "単語が存在しません"
            )
