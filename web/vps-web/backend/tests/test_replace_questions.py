import main
from unittest.mock import MagicMock
from types import SimpleNamespace

request_mock = MagicMock()
request_mock.session = {"uid": 10}

db_mock = MagicMock()
db_mock.query.return_value.filter.return_value.first.return_value = SimpleNamespace(
        id=1,
        word="cat",
        meaning="猫",
        uid=10
    )

db_no_mock = MagicMock()
db_no_mock.query.return_value.filter.return_value.first.return_value = None

def test_replace_questions():
    new_data = main.Question(id=1, word="duck", meaning="アヒル")
    result = main.replace_questions(request_mock, new_data, db_mock)
    assert result == ("テーブルがアップデートされました", 1, "duck")

def test_replace_no_questions():
    new_data = main.Question(id=50, word="duck", meaning="アヒル")
    result = main.replace_questions(request_mock, new_data, db_no_mock)
    assert result == "データに異常があります"
