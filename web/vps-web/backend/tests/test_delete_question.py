import main
from unittest.mock import MagicMock
from types import SimpleNamespace

request_mock = MagicMock()
request_mock.session = {"uid": 10}

db_mock = MagicMock()
db_mock.query.return_value.filter.return_value.all.return_value = [
    SimpleNamespace(id=1, word="cat", meaning="猫", uid=10),
    SimpleNamespace(id=2, word="dog", meaning="犬", uid=10),
    SimpleNamespace(id=3, word="bird", meaning="鳥", uid=10),
    SimpleNamespace(id=4, word="cow", meaning="牛", uid=10)
]
db_mock.commit.return_value = None

db_no_mock = MagicMock()
db_no_mock.query.return_value.filter.return_value.all.return_value = []

def test_delete_question():
    delete_ids = [
        1,
        2,
        3,
        4,
    ]
    result = main.delete_question(request_mock, delete_ids, db_mock)
    assert result == ("以下の問題が削除されました",[
        "cat",
        "dog",
        "bird",
        "cow"
    ])

def test_delete_no_question():
    delete_ids = [
    1,
    2,
    3,
    4,
]
    result = main.delete_question(request_mock, delete_ids, db_no_mock)
    assert result == "データが削除されませんでした"
