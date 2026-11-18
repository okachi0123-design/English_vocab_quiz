import main
from unittest.mock import MagicMock

request_mock = MagicMock()
request_mock.session = {"uid": 10}

def get_questions_mock(uid,db,attempt_count):
    return [{"id": 1, "word": "apple"},{"id": 2, "word": "orange"},{"id": 3, "word": "cat"}]

# 100以上弾き確認
def test_attempt_100over_prepare_questions():

    result=main.prepare_questions(100,request_mock,None)

    assert result == "問題数が多すぎます"

# 0弾き確認
def test_attempt_0_prepare_questions():

    result=main.prepare_questions(0,request_mock,None)

    assert result == "１つ以上を選択してください"

# パスワードチェック T
def test_prepare_questions(monkeypatch):
    monkeypatch.setattr(
        main,'get_questions',get_questions_mock
    )

    result=main.prepare_questions(3,request_mock,None)

    assert result == [{"id": 1, "word": "apple"},{"id": 2, "word": "orange"},{"id": 3, "word": "cat"}]