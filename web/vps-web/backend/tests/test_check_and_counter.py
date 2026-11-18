import main
from unittest.mock import MagicMock
from collections import namedtuple

Row = namedtuple("Row", ["id", "meaning"])

request_mock = MagicMock()
request_mock.session = {"uid": 10}

db_all_true_mock = MagicMock()
db_all_true_mock.query.return_value.filter.return_value.all.return_value = [
    Row(1,"猫"),
    Row(2,"犬")
]

def test_check_and_counter_all_true():

    answers = [
    main.Answer(id=1, meaning="猫"),
    main.Answer(id=2, meaning="犬")
    ]

    result = main.check_and_counter(request_mock, answers, db_all_true_mock)
    assert result == {
        "results": [
            {"result": "〇"},
            {"result": "〇"}
        ],
        "attempt": 2,
        "score": 2,
        "percentage": 100,
        "message": "天才",
    }

def test_check_and_counter_half_true():

    answers = [
    main.Answer(id=1, meaning="猫"),
    main.Answer(id=2, meaning="オオカミ")
    ]

    result = main.check_and_counter(request_mock, answers, db_all_true_mock)
    assert result == {
        "results": [
            {"result": "〇"},
            {
                "result": "✕",
                "answer": "犬"
            }
        ],
        "attempt": 2,
        "score": 1,
        "percentage": 50,
        "message": "一番おもんない",
    }
