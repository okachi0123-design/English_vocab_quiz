# 日ごとの開発記録
## 日時
### 作業内容
### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること


## 2026-08-18

### 作業内容
#### 環境構築
- Python仮想環境導入
```
  python3 -m venv .venv
  source .venv/bin/activate
```
‐ Python仮想環境内に`fastapi,uvicorn`をインストール、コード記述後Webサーバーを起動
```
   python -m pip install fastapi uvicorn
　 python -m uvicorn main:app --reload
```
#### main.pyコーディング 
- FastAPIによるWebアプリ起動と簡単な`GET`記述
- fastapiライブラリから FastAPIを取得
```
from fastapi import FastAPI 

app = FastAPI()

@app.get("/greet")
def greet():
    return"Welcome to English quiz!"

```

### 設計・判断

### 学んだこと

### エラー・解決

### 次回やること

## 2026-08-19

### 作業内容
#### データベースモデル(pydantic)の作成
```
from pydantic import BaseModel

class Phrase(BaseModel):
    id: int
    word: str
    meaning: str
```
#### 全体の流れの整理
- GETとPOSTの流れを決定
- データの流れを整理

### 設計・判断
#### アプリの形式
- FastAPI+PostgreSQLのVPS運用版WebアプリとS3フロントエンド+APIゲートウェイ+AWS Lambda+PostgreSQLのAWS運用版Webアプリの２形式で行う
#### クイズ形式
- １問ずつ解答、採点を繰り返す予定から、挑戦数の問題を一気に表示して解答に変更
- 理由：GET、POSTを繰り替えさなければならないから。
### 学んだこと
- GETとPOSTは同じfor内に入れられない

### エラー・解決
- GET（問題、解答取得）とPOST（解答入力）の繋げ方
### 次回やること
- GET,POSTの記述

## 2026-08-20
### 作業内容
- 解答受付と採点機能のコーディング
- 上のテスト
- 解答用のデータモデル追加
- POST（解答受付と採点機能）の制作とテスト
### 設計・判断
#### 解答受付と採点機能
- 解答とidの組み合わせのリストを受け取り、それをfor上から採点する形式に（FastAPIがJSONでリストのように送るから）
- for１回ごとに戻り値を出すようにして、その合計をスコアにした
#### 出題機能
- 上の解答機能の影響で、DBから取ったデータを一度リストに挿入する形式に（各回使ったリストを掃除する必要が出てくるかも）
### 学んだこと
- POSTはリストの形式で送る
### エラー・解決
#### データモデルと引数データ形式の不一致
‐ 原因:
関数を定義したファイルではモデルから形式を指定していた
`def ask_question(answer: Answer, questions):`
しかし、コードの方ではリストの各値ごとにデータを与えていた。
`ask_question(answer.id, answer.meaning, questions)`
- 解決策: 前者にそろえた

#### 422 Unprocessable Entity (URLのエラー)
- 原因：
当初は1問ごとに1回の解答をPOSTする設計で、idをURLの`/{id}` から受け取る形にしていた。
その後、まとめて出題し、解答もまとめてPOSTする設計に変更したが、URL側の /{id} を残したままにしていたので、FastAPIが id: int として解釈できずエラーが起きた。
- 解決策:  `｛id｝`を消して、idも解答もまとめてリストで送る形式にした。

#### Pythonコードエラー
- 原因：
ask.py(採点機能)の返り値を合計して正答数を割り出していたが、その中に指定した`id`がリストになければ`return　"not found"`と返す設計になっていたため、数値＋文字になりエラーが起きた。
- 解決策： 一時的に見つからなかったときは0を返すようにした。このidチェックはask.pyに入る前に行う必要がある。
### 次回やること
- DB設計、DB接続、データ取得

## 2026-08-23
### 作業内容
#### 採点機能に〇、✕と正解の表示機能追加
- check_and_counter関数のfor文の中にifで各問題の正誤から〇、✕、正解をリストに追記、最後にリストを返す機能を追加した
#### データベース設計（詳細はdb_devlog.md）
- 使用環境、ツールのインストール
- クラス設計
- DB設定ファイルの作成(database_conf.py, sql_dbmodels.py, .env)
#### 環境構築
### 設計・判断
### 学んだこと
- 各問題の〇✕を返したいときfor文中に'yield'を入れて毎回返すのではなく、リスト追記で同時に返した方が良い。理由：１つずつ送る場合、フロントエンドが複雑になるから。この場合だと処理が小さくリストによる一斉送信で十分。
### エラー・解決
### 次回やること
- DB接続機能追加


## 2026-08-24
### 作業内容
#### DB作成
- PGAdminで先にデータベースを作成
- 先に指定したCLASSとinitdb関数でテーブルを作成、PGAdminで確認
- `.env`の設定
#### CRUDのDB接続
- init_db　テーブルを数えて0ならリストから追加する関数　
### 設計・判断
### 学んだこと
- 環境変数ファイル`.env`の作り方
- `.env`をファイルに適用させる方法
### エラー・解決
### 次回やること
- CRUDとDBの接続

## 2026-08-26
### 作業内容
#### DBセッションのライフサイクル管理と依存関係用関数の設定
- DBにセッションする際に、アクセスを確立させてエラー時もDBとの接続を停止させるための関数`get_db`を用意した。
- `get_db`をDBと関連する関数の依存関係に置いて、↑を各関数に適用させた
```
def init_db():
    db = SessionLocal()

    count = db.query(sql_dbmodels.SQLQuestion).count()

    if count == 0:

        for question in questions:
           db.add(sql_dbmodels.SQLQuestion(**question.model_dump()))
        db.commit()
    db.close()
```
#### DBからランダムデータの抽出(GETの完成)
- SELECT * FROM テーブル名　ORDER BY RAMDOM() LIMIT 指定数;を使う
- ORDER BY RAMDOM()をsqlalchemy上で使うために調べた
- ↑funcのrandomを使う
```
from  sqlalchemy import func
from sqlalchemy.orm import Session
import sql_dbmodels

def get_questions(attempt_count: int, db: Session):
    questions = db.query(sql_dbmodels.SQLQuestion).order_by(func.random()).limit(attempt_count).all()
    return questions
```
- ↑の関数をgetに入れてテストし、完成
```
@app.get("/quiz")
def prepare_questions(attempt_count: int, db: Session = Depends(get_db)):
    
    questions = get_questions(attempt_count, db)#DBから単語取得
    
    return questions
```
  
#### 設計の練り直し

### 設計・判断
- クイズアプリのURLの流れ　ルートでトップ画面と挑戦するかを聞く→挑戦するを押すと`post("/attempt")`を開いて挑戦数を受け取る→DBから問題を受け取る→クイズ→採点→結果通知
- "/attempt"はフロントエンドで挑戦を選択するとurlが開かれるようにする
- `get("/quiz")`でクイズを表示し、そのままフロントエンドに残す→`post("/quiz")`で解答とidを送信→idからDBを検索し、そのリストと解答を比較という形にする
### 学んだこと
- 各HTTPmethodはそれぞれの変数を引き継がないので分けて考えなければならない。
### エラー・解決
#### import忘れ
- Session関数、get_questions関数などをimportするのを忘れていた。
### 次回やること
- CRUDとDB接続

## 2026-08-27
### 作業内容
#### get_questionsの修正
- これまではmeaningも含めてテーブルのランダム指定行すべての値を取ってくるようにしていたが、idとwordだけ取るようにした
- １列ずつで取るとrowとしてデータが返されるので、それを辞書にまとめるように変更した
### 設計・判断
### 学んだこと
### エラー・解決
#### rowのJSON変換エラー
-  原因：db.queryで１列ずつ取るとリストではなくなりJSONに変換できなかった
-  解決：rowをfor文で辞書に挿入していく形式に変更した
```
 question_rows = db.query(sql_dbmodels.SQLQuestion.id, sql_dbmodels.SQLQuestion.word).order_by(func.random()).limit(attempt_count).all()
    questions =[
    {"id": row.id, "word": row.word}
    for row in question_rows
]
```
### 次回やること
- URLの連携


## 2026-08-31
### 作業内容
#### Password認証の仕組みづくりとURL連携
- POSTの本文と.envから持ってきたパスワード変数をifで比較し、同じなら次のURLの"GET"に繋がるようにした（ifテスト済み）
```
@app.post("/pass") #パスワード認証
def password_auth(entered_password :str):
    password = os.getenv("PASSWORD")
    if password == entered_password:
        return RedirectResponse(
        url="/attempt",
        status_code=303
        )
    else:
        return "Password is not correct"
    
```
### 設計・判断
- `post("/attempt")`を開いて挑戦数を受け取る→DBから問題を受け取る→クイズ の流れから `post("/attempt")`を消して　`get("/quiz")`で挑戦数を受け取り、それに応じてDBから問題を受け取って出題→`post("/quiz")`で解答を送信　という形に変更
理由：URLのリダイレクトを学ぶ中で、POSTからPOSTへの場合は同じ本文を保持してできるが、GETへの時はできないことが分かったから
### 学んだこと
### エラー・解決

#### `str` と `int` の型違いによるパスワード比較エラー

-原因： `.env` から `os.getenv()` で取得した値は文字として取得されるが、入力パスワードのpudanticモデルを`int`にしていた

```
@app.post("/pass") #パスワード認証
def password_auth(password, entered_password :"int"): #ここのint
    password = os.getenv("PASSWORD")
    if password == entered_password:
        return RedirectResponse(
        url="/attempt",
        status_code=303
    )
```

### 次回やること
- URL連携続き
- フロントエンド

## 2026-09-01
### 作業内容
#### URL連携（/attemptと/quizの統合）
- attempt内で挑戦数を聞いて、画面切り替え後にquizで挑戦をやめて同画面で行う
#### 結果送信
- scoreとattemptから％を計算する関数`result()`とその結果を基にメッセージを送る関数`message()`を作った
- 小数を`round(2)`で小数第二位までにした

- check_and_counter
```
@app.post("/quiz")
def check_and_counter(answers: list[Answer], db: Session = Depends(get_db)):
    score = 0
    attempt = 0
    results = []
    for answer in answers:
        is_correct = ask_question(answer,questions)
        if is_correct == 1:  
            results.append({
                "result": "〇"
            })
        else:
            id = answer.id
            for question in questions:
                if question.id == id:
                    correct_answer = question.meaning
                    results.append({
                "result": "✕",
                "answer": correct_answer
            })

    
            

        score = score + is_correct
        attempt = attempt + 1

        percentage = result(score, attempt)
        percentage = round(percentage, 2)
        
        result_message = message(percentage)
```
- result
```
def result(score: int, attempt: int):
    percentage = score/attempt*100
    return percentage
```
- message
```
def message(percentage: float):
    if percentage == 100:
        return "天才"
    elif percentage == 50:
        return "一番おもんない"
    elif percentage >= 90:
        return "や、やるやん"
    elif percentage >= 75:
        return "そこそこ頑張ったな"
    elif percentage >= 60:
        return "まあまあやな"
    elif percentage >= 40:
        return "しょうもない点数"
    elif percentage >= 30:
        return "弱い"
    elif percentage >= 20:
        return "雑魚"
    elif percentage >= 10:
        return "フッw 何個かは当たってるやん"
    elif percentage >= 0:
        return "..."
```
#### 採点形式の変更
- questionリストからid検索をして照合していたが、このリストは共有されないのでqueryでdbを再検索するように変更した
- 変更前　check_and_counter
```
@app.post("/quiz")
def check_and_counter(answers: list[Answer], db: Session = Depends(get_db)):
    score = 0
    attempt = 0
    results = []
    for answer in answers:
        is_correct = ask_question(answer,questions)
        if is_correct == 1:  
            results.append({
                "result": "〇"
            })
        else:
            id = answer.id
            for question in questions:
                if question.id == id:
                    correct_answer = question.meaning
                    results.append({
                "result": "✕",
                "answer": correct_answer
            })
```
- 変更前　　ask_question
```
from models import Answer

def ask_question(answer: Answer,questions):
    for question in questions:
            if question.id == answer.id:
                if question.meaning == answer.meaning:
                    return 1
                else:
                    return 0



    return 0
```

- 解決策A　ask側で毎回idからDB検索（自分だけで出来た）＋不正解時もcheck側で正答を再検索
- check_and_counter
- まず　正答検索用のid `sol_id`を指定
- `sol_id`を使ってDBをフィルター検索し、意味を取りだす
```
@app.post("/quiz")
def check_and_counter(answers: list[Answer], db: Session = Depends(get_db)):
    score = 0
    attempt = 0
    results = []
    for answer in answers:
        is_correct = ask_question(answer, db)
        if is_correct == 1:  
            results.append({
                "result": "〇"
            })
        else:
            sol_id = answer.id
            solution = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.id == sol_id).first()
            correct_answer = solution.meaning
            results.append({
                "result": "✕",
                "answer": correct_answer
            })
```

- ask_question
- まずDB検索用の`sol_id`を指定
- ↑でフィルター検索
- 同idのmeaning同士を比較させる
```
from models import Answer
from sqlalchemy.orm import Session
import sql_dbmodels

def ask_question(answer: Answer, db: Session):
    
    sol_id = answer.id

    solution = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.id == sol_id).first()

    if solution.meaning == answer.meaning:
        return 1
    else:
        return 0



    return 0
```
- 解決策B　idをリストに入れて一挙検索して新リスト作成　（リストによる検索方法分からない）　　*イベント駆動のlambda版番はこの一挙検索が必須かも？
- ＊解決策A適用前に戻し済
- check_and_counter
- まず`answers`リストのidだけを抜き出して、`answer_ids`リストに`append`
- そのリストでDB検索
`検索方法：　db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.id.in_(answer_ids)).all()　　と、== + first ではなく　in_(リスト) + all の形`
- questionsリストを全てsolutionsに変換
```
@app.post("/quiz")
def check_and_counter(answers: list[Answer], db: Session = Depends(get_db)):
    score = 0
    attempt = 0
    results = []
    
    answer_ids = []
    for answer in answers:
        answer_id = answer.id
        answer_ids.append(answer_id)

    solutions = db.query(sql_dbmodels.SQLQuestion.id, sql_dbmodels.SQLQuestion.meaning).filter(sql_dbmodels.SQLQuestion.id.in_(answer_ids)).all()


    for answer in answers:
        is_correct = ask_question(answer,solutions)
        if is_correct == 1:  
            results.append({
                "result": "〇"
            })
        else:
            id = answer.id
            for solution in solutions:
                if solution.id == id:
                    correct_answer = solution.meaning
                    results.append({
                "result": "✕",
                "answer": correct_answer
            })

```
- ask_questions
- solutionsに変換
```
from models import Answer

def ask_question(answer: Answer,solutions):
    for solution in solutions:
            if solution.id == answer.id:
                if solution.meaning == answer.meaning:
                    return 1
                else:
                    return 0



    return 0
```

#### 認証設定
- ("/pass")を廃止し、("/quiz")下の各Methodにパスワード認証を追加する
- 各Methodの依存関係にパス認証の関数を入れ、その返り値をif比較することで認証する
- パスワードの送信方法はHTTPのヘッダーで行う
- `pass_auth.py`に`password_auth`関数を入れる
- ↑の結果を変数に入れてmainに返す関数`check_password`を作る
- `check_password`を各Methodの依存関係に入れる
- pass_auth.py
```
from dotenv import load_dotenv
import os

def password_auth(entered_password :str):
    password = os.getenv("PASSWORD")
    if password == entered_password:
        return 1
    else: 
        return 0
```
- check_password
```
def check_password(enterd_password: str = Header()):
    result_auth = password_auth(enterd_password)
    return result_auth
```
- 依存関係
```
result_auth: int = Depends(check_password)
＋
if result_auth == 1:
.
.
.
else:
        return "パスワードが正しくありません"
```
- フロントエンド制作の簡単な計画

### 設計・判断
- 採点形式をfor文中に都度都度DB検索を行う方法で書いたが、いずれlambda版に変更することとDB検索数が多くなる問題からidリストで検索してその結果をリストに入れる方法に変更した
- ↑の結果　元のリストを利用したcheck_and_counterとask_questionに戻した

- ("/pass")の廃止
- 理由：/passだとその認証状態の維持に苦戦することに気づいた。
- 解決策：("/quiz")の各Methodにパス認証を追加する

- フロントエンド制作計画
- codexメイン
- HTML/CSSはほぼ書かない
- API仕様を先に渡す
- fetch() 部分は自分でも理解する
### 学んだこと
### エラー・解決
### 次回やること
- フロントエンド制作


## 2026-09-02
### 作業内容
#### フロントエンド制作
- UIの選択　`dribbble.com`でクイズのデザインを探す
- VSCodeにCodexを導入する
- 構成を考えてCodexに渡す
- 完成しフロントエンドをチェック

#### バックエンドとフロントエンドの接続
##### CORSの設定
- CORSのチェックをするミドルウェアを追加
`app.add_middleware(
    CORSMiddleware,`
- フロントエンドからのリクエストを受け取れるように許可する
`allow_origins=[
    "http://localhost...",
    "http://...",
],`
- 許可するmethodを設定する
`allow_methods=["GET", "POST", "OPTIONS"]`
- 許可するHTTPヘッダーを設定する
`allow_headers=["Content-Type", "enterd-password"]`
### 設計・判断
- URL設計の変更　　バックエンド側のURLを("api/quiz")のようにapiをつけることでフロントエンドとのurlの衝突を防ぐ
### 学んだこと
### エラー・解決
### 次回やること
- バックエンドの整理
- VPSデプロイ


##   2026-09-03
### 作業内容
#### バックエンドの整理
##### 挑戦数の有効範囲設定
- attempt_countをifで　1以上100未満でないと動かないようにした。
```
@app.get("/api/quiz")
def prepare_questions(attempt_count: int, db: Session = Depends(get_db), result_auth: int = Depends(check_password)):
if attempt_count >= 100: 
        return "問題数が多すぎます"
    elif attempt_count <= 0:
        return "１つ以上を選択してください"
    else: ....

```
- AIによるフロントエンドの調整　上下限を超えるリクエストに対するエラーメッセージの追加
### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること
- VPSデプロイ

## 2026-09-06
### 作業内容
#### VPSデプロイ
- VPSの`/English_vocab_quiz`内で`git pull`
- Python仮想環境内にライブラリをインストール
```
pip freeze > requirements.txt　#ローカルで今使っているライブラリ表示

pip install -r requirements.txt #導入側にrequirements.txtをPULLして、それを基にインストール
```

- PostgreSQLをVPS内に導入
```
sudo apt update
sudo apt install postgresql postgresql-contrib -y

sudo -u postgres psql

CREATE USER ユーザー名 WITH PASSWORD 'パスワード';

CREATE DATABASE DB名 OWNER ユーザー名;
```

- .envのURL設定  .env_example

- `init_db()`実行でテーブル作成

### 設計・判断
- テーブル作成(init_db)はpythonリストから全て１度に送信していたが、今後データ追加のために データ追加用のPOST、修正用のPUT、DELETEを導入することに
### 学んだこと
### エラー・解決
### 次回やること
- データ追加用のPOST、修正用のPUT、DELETの作成
- VPSデプロイ続き


## 2026-09-07
### 作業内容
#### PUTの追加
- `id``meaning``word`の組み合わせを与えて、その`id`からDBを検索し、置き換える仕組みに
```
@app.put("/api/quiz")
def replace_questions(new_data: Question ,db: Session = Depends(get_db)):
 
    old_data = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.id == new_data.id).first()
    if old_data:
        old_data.word = new_data.word
        old_data.meaning = new_data.meaning
        db.commit()
        return "テーブルがアップデートされました"

    else:
        return "データに異常があります"
```

#### データ追記用POSTの追加
- 現状の最大のID + 1でidを指定する設計から変更し、以下にした
- `primary_key=True`を指定しているため自動でidを追記してくれることを利用した追記方法
- idを含まないモデル `NewQuestion`を追加、import
```
class NewQuestion(BaseModel):
    word: str
    meaning: str
```
- init_dbの要領でデータ追加

```
@app.post("/api/data")
def add_question(questions: list[NewQuestion], db: Session = Depends(get_db)):
    
    for question in questions:
       db.add(sql_dbmodels.SQLQuestion(**question.model_dump()))
    db.commit()
```
- ＊id認識のずれによるエラー発生

### 設計・判断
### 学んだこと
### エラー・解決
- PostgreSQLの自動採番エラー
- エラー文`sqlalchemy.exc.IntegrityError: (psycopg2.errors.UniqueViolation) duplicate key value violates unique constraint "eng_vocabulary_words_pkey"
DETAIL:  Key (id)=(1) already exists.`
- idを指定しないことで自動で`id = 1`として挿入しようとしたがすでに存在していたことでエラーが起きた
- 原因:手動でidを入力したリストを`model_dump`したため、PostgreSQL内の自動採番ではまだidが無いものと認識していた
### 次回やること
- PostgreSQLの自動採番エラーの解決


## 2026-09-08
### 作業内容
#### PostgreSQLの自動採番エラーの解決
- `SELECT MAX(id) FROM eng_vocabulary_words;`で表示される最大IDが正しいか確認
- 正しければ↓で`PostgreSQL`に最大IDを認識させる
```
SELECT setval(
    pg_get_serial_sequence('eng_vocabulary_words', 'id'),
    (SELECT MAX(id) FROM eng_vocabulary_words)
);
```
- データ追加をテスト

#### データ追記用POSTの改善
- 同一単語の追加を防ぐために一度英単語で条件検索をかける仕組みを追加
```
for new_question in new_questions:

        same_word = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.word == new_question.word).first()

        if same_word:
        else: #データ追加実行
  ```
- エラーメッセージの追加
```
 error_message = []
.
.
.
 if same_word:
            error_message.append({same_word.word, "同一単語が存在します"})
```
- 同様に成功メッセージの追加
```
succes_message = []
.
.
.
else:
            db.add(sql_dbmodels.SQLQuestion(**new_question.model_dump()))
            db.commit()
            succes_message.append({new_question.word, "単語が追加されました"})
```
- メッセージのset送信によって英単語と結果文の順番がずれるエラーの発生
- メッセージと単語の組み合わせを辞書に変更
```
error_message.append({
                "word": same_word.word,
                "message": "同一単語が存在します"
            })
```

#### DELETEの追加
- IDで検索し１つづつ削除する形式
```
@app.delete("/api/data")
def delete_question(delete_id: int, db: Session = Depends(get_db)):
    delete_item = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.id == delete_id).first()
    if delete_id:
        db.delete(delete_item)
        db.commit()
        return "該当問題が削除されました"
    else:
        return "IDが見つかりませんでした"
```

- check_and_counterの要領を使い、まとめてリストで検索、forで削除に変更
```
@app.delete("/api/data")
def delete_question(delete_ids: list[int], db: Session = Depends(get_db)):
    delete_items = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.id.in_(delete_ids)).all()
    deleted_words = []
    for delete_item in delete_items:
        db.delete(delete_item)
        db.commit()
        deleted_words.append(delete_item.word)

    if deleted_words:
        return "以下の問題が削除されました",deleted_words
    else:
        return "データが削除されませんでした"
``` 
### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること
- VPS内のPostgreSQLへのデータ導入

## 2026-09-09
### 作業内容
#### VPS内のPostgreSQLへのデータ導入
##### VPSをLocalHostとするWEBサーバー起動、接続
- VPS上のローカルホストでWEBサーバーを起動し、SSHポートフォワーディングを利用してFastAPI実行環境を用意する
- Powershell内でsshキーペアを用意し、VPSに登録
- `ssh -i 秘密鍵 -L 8000:127.0.0.1:8000 ユーザー名@IPアドレス`　でVPCのローカルホストにSSHトンネルを開く
- http://localhost:8000/docsで  FastAPIのテスト環境を開きDBを操作する

##### DBの操作
###### init_db()による自動採番エラーの予測と対策
- Webサーバー起動時に`init_db()`が動き、リストからテーブルを用意するが、そのリストはidが振られているため、そのidと新規追加用の自動採番idのずれが起きる
- 今回は`DELETE`で消した後に`add_question`でidなしのデータをもう一度追加した
- 次回以降の対策として`init_db()`が扱うリストをid無しにして最初から自動採番を利用する形式に変更した　（テスト済み）
###### テーブルへのデータ追加
- 新たな`init_db`でテーブルを作り、残りのデータを`add_question`で挿入したが、スペルミスによる`add_question`のエラーが起きた
- もう一度DELETEで削除し、修正後追加したがすでに自動採番で5まで割り振りされており、テーブルを削除した
- すべての修正を終え、テーブルにデータを挿入した
### 設計・判断
### 学んだこと
### エラー・解決
#### 自動採番後のDELETEによってidが利用済になったエラー
- 詳細：新たな`init_db`でテーブルを作り、残りのデータを`add_question`で挿入したが、スペルミスによる`add_question`のエラーが起きた。もう一度DELETEで削除し、修正後追加したがすでに自動採番で5まで割り振りされていた
- 解決：テーブルを削除した
- `sudo -u postgres psql -d DB名` でpostgreユーザーとしてアクセス
- `TRUNCATE TABLE eng_vocabulary_words RESTART IDENTITY;`でテーブルデータの削除


### 次回やること
- ポート開放
