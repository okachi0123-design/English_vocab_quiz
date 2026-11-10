import question
from unittest.mock import MagicMock
from collections import namedtuple

Row = namedtuple("Row", ["id", "word"])

mock = MagicMock()
mock.query.return_value.order_by.return_value.limit.return_value.all.return_value = [
    Row(1, "cat"),
    Row(2, "dog"),
    Row(3, "bird")
]
def test_get_questions():
    result=question.get_questions(3,mock)
    assert result == [
        {"id": 1, "word": "cat"},
        {"id": 2, "word": "dog"},
        {"id": 3, "word": "bird"},
    ]


