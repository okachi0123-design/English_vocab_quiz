import main
from unittest.mock import MagicMock
from collections import namedtuple

Row = namedtuple("Row", ["id", "word", "meaning", "uid"])

request_mock = MagicMock()
request_mock.session = {"uid": 10}

db_mock = MagicMock()
db_mock.query.return_value.filter.return_value.all.return_value = [
    Row(1, "cat", "猫", 10),
    Row(2, "dog", "犬", 10),
    Row(3, "bird", "鳥", 10),
    Row(4, "cow", "牛", 10),
]

db_no_mock = MagicMock()
db_no_mock.query.return_value.filter.return_value.all.return_value = []

def test_get_all_questions():
    result = main.get_all_questions(request_mock, db_mock)
    assert result == [
    Row(1, "cat", "猫", 10),
    Row(2, "dog", "犬", 10),
    Row(3, "bird", "鳥", 10),
    Row(4, "cow", "牛", 10),
]

def test_get_no_questions():
    result = main.get_all_questions(request_mock, db_no_mock)
    assert result == []