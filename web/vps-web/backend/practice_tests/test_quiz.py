import main
 
def get_db_mock():
    return db

def check_password_true_mock():
    result_auth = 1
    return result_auth

def check_password_false_mock():
    result_auth = 0
    return result_auth

def login_checker_mock():
    return 

def get_questions_mock(db,attempt_count):
    return [{"id": 1, "word": "apple"},{"id": 2, "word": "orange"},{"id": 3, "word": "cat"}]

# 100以上弾き確認
def test_attempt_100over_prepare_questions(monkeypatch):
    monkeypatch.setattr(
        main,'get_db',get_db_mock
    )
    monkeypatch.setattr(
        main,'check_password',check_password_true_mock
    )
    monkeypatch.setattr(
        main,'login_checker',login_checker_mock
    )

    result=main.prepare_questions(100,None,1)

    assert result == "問題数が多すぎます"

# 0弾き確認
def test_attempt_0_prepare_questions(monkeypatch):
    monkeypatch.setattr(
        main,'get_db',get_db_mock
    )
    monkeypatch.setattr(
        main,'check_password',check_password_true_mock
    )
    monkeypatch.setattr(
        main,'login_checker',login_checker_mock
    )

    result=main.prepare_questions(0,None,1)

    assert result == "１つ以上を選択してください"

# パスワードチェック T
def test_all_true_prepare_questions(monkeypatch):
    monkeypatch.setattr(
        main,'get_db',get_db_mock
    )
    monkeypatch.setattr(
        main,'check_password',check_password_true_mock
    )
    monkeypatch.setattr(
        main,'login_checker',login_checker_mock
    )
    monkeypatch.setattr(
        main,'get_questions',get_questions_mock
    )

    result=main.prepare_questions(3,None,1)

    assert result == [{"id": 1, "word": "apple"},{"id": 2, "word": "orange"},{"id": 3, "word": "cat"}]


# パスワードチェック F
def test_pass_false_prepare_questions(monkeypatch):
    monkeypatch.setattr(
        main,'get_db',get_db_mock
    )
    monkeypatch.setattr(
        main,'check_password',check_password_false_mock
    )
    monkeypatch.setattr(
        main,'login_checker',login_checker_mock
    )

    result=main.prepare_questions(3,None,0)

    assert result == "パスワードが正しくありません"