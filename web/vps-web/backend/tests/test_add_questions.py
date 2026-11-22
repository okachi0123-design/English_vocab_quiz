import main
from unittest.mock import MagicMock
from collections import namedtuple

Same_data_Row = namedtuple("Row", ["id", "word", "meaning", "uid"])
request_mock = MagicMock()
request_mock.session = {"uid": 10}



db_all_true_mock = MagicMock()
db_all_true_mock.query.return_value.filter.return_value.first.return_value = None
db_all_true_mock.add.return_value = None
db_all_true_mock.commit.return_value = None

db_same_word_mock = MagicMock()
db_same_word_mock.query.return_value.filter.return_value.first.side_effect = [
    Same_data_Row(1, "cat", "猫", 10),
    None,
    None,
    None
]
db_same_word_mock.add.return_value = None
db_same_word_mock.commit.return_value = None

db_all_same_mock = MagicMock()
db_all_same_mock.query.return_value.filter.return_value.first.side_effect = [
    Same_data_Row(1, "cat", "猫", 10),
    Same_data_Row(2, "dog", "犬", 10),
    Same_data_Row(3, "bird", "鳥", 10),
    Same_data_Row(4, "cow", "牛", 10),
]
db_all_same_mock.add.return_value = None
db_all_same_mock.commit.return_value = None


def test_add_question_all_true():
    new_questions = [
        main.NewQuestion(word="cat", meaning="猫"),
        main.NewQuestion(word="dog", meaning="犬"),
        main.NewQuestion(word="bird", meaning="鳥"),
        main.NewQuestion(word="cow", meaning="牛")
    ]
    result = main.add_question(request_mock, new_questions,db_all_true_mock)
    assert result == (
    [
        {"word": "cat", "message": "単語が追加されました"},
        {"word": "dog", "message": "単語が追加されました"},
        {"word": "bird", "message": "単語が追加されました"},
        {"word": "cow", "message": "単語が追加されました"},
    ],
    []
    )

def test_add_question_same_word():
    new_questions = [
        main.NewQuestion(word="cat", meaning="猫"),
        main.NewQuestion(word="dog", meaning="犬"),
        main.NewQuestion(word="bird", meaning="鳥"),
        main.NewQuestion(word="cow", meaning="牛")
    ]
    result = main.add_question(request_mock, new_questions,db_same_word_mock)
    assert result == (
    [
        {"word": "dog", "message": "単語が追加されました"},
        {"word": "bird", "message": "単語が追加されました"},
        {"word": "cow", "message": "単語が追加されました"},
    ],
    [
        {"word": "cat", "message": "同一単語が存在します"}
    ]
    )

def test_add_question_all_same():
    new_questions = [
        main.NewQuestion(word="cat", meaning="猫"),
        main.NewQuestion(word="dog", meaning="犬"),
        main.NewQuestion(word="bird", meaning="鳥"),
        main.NewQuestion(word="cow", meaning="牛")
    ]
    result = main.add_question(request_mock, new_questions,db_all_same_mock)
    assert result == (
    [],
    [
        {"word": "cat", "message": "同一単語が存在します"},
        {"word": "dog", "message": "同一単語が存在します"},
        {"word": "bird", "message": "同一単語が存在します"},
        {"word": "cow", "message": "同一単語が存在します"},
    ]
    )