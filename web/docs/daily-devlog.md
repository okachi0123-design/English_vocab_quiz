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
`検索方法：　
Attach files by dragging & dropping, selecting or pasting them.
db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.id.in_(answer_ids)).all()　　と、== + first ではなく　in_(リスト) + all の形`
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

## 2026-09-13
### 作業内容
#### Nginxの導入
##### Nginxとは
`１.ロードバランサー`
- WebサーバーでWebサイトのリクエストを受け取ってそれをサーバーに渡して、その応答をWebサイトに返す中継をするriverse proxy
- 中継する理由：サーバー数が増えたときにWebサイトがリクエストを送る先を統一させるため　Load Balancer
- ELBとの違い：ELBはオートスケーリングなどを備えたマネージドサービス、NginxはソフトウェアのLBで、自分好みにカスタムしやすい一方、構成やスケール、ヘルスチェックなどを自身で設定しなければならない
`２.SSL暗号化、複合`
- HTTPSをHTTPにして、それしか受け取れないUvicornに渡したり
- HTTPをHTTPSに暗号化したりする
##### nginx.conf
- VSCodeの設定ファイルを見る
- それぞれのDirective(設定項目？)のキーとその値のペアで各種の設定する *HTTP ならコンテキスト内にそれを定義するDirectiveとその値のセットがいくつか置かれている



### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること

## 2026-10-19
### 作業内容
#### Nginx導入
##### Nginxとは（続き）
- キャッシュもできる
- Nginxを複数サーバーに関連付けて入口を制限することで、攻撃の糸口を減らすことができる
- 暗号化されていない通信を拒否できることで暗号化を強制できる
- 画像やビデオファイルを圧縮して帯域幅を節約するような構成にもできる
- チャンク単位でのデータの送信もできる
- Nginx Ingress ControllerはKubanetesのProxy,Lbとして活用できる　トラフィックを受信後 クラスター定義に従った適切なサービスへのLBを実現出来る　ELB(主にNLB)をエントリーポイントとしてNginx Ingress Controllerにつなげる事でセキュリティレベルを向上できる(ALBだけで実現できる)
###### Apacheとの違い
- Apache:レガシーシステムによる動的コンテンツ配信に強い　カスタムしやすい
- Nginx:早く軽量、大量の静的コンテンツ配信に強み、設定が簡単
##### nginx.confとは
- 上記のSSL通信やキャッシュ、圧縮などのサービスを実行させるための設定ファイル
- ディレクティブ（指示や命令）で定義できる
- Web,Proxyサーバーとして機能させるにはトラフィックを他のサーバーに転送するか、自身で処理をするかを決める
- リッスンするポートを決めて、通信の形態を制御できる　HTTP(80)をHTTPS(443)にリダイレクトさせるなど
- ↑の際にSSL/TLS証明書や公開鍵、秘密鍵も指定する
- 負荷分散アルゴリズムを決めることが出来る
- 構成ブロックと全てのディレクティブをまとめたサイトがある
##### 設計
- Nginxを静的コンテンツ配信＋reverse proxyとして,動的コンテンツは現状のuvicornを使う
###### すべきこと
- Nginxの設定
- Nginxとuvicornを繋ぐ
- ドメイン取得、DNS設定(URL)

### 学んだこと
### エラー・解決
### 次回やること
- Nginx導入続き

## 2026-10-20
### 作業内容
#### ローカルReactとVPSバックエンド接続による動作確認
- SSHポートフォワーディングでVPSのバックエンドをローカルと接続
- ローカルの18000番ポートをVPSの8000番ポートに転送
- ローカルで18000番ポートにアクセス、動作確認
- ローカルReactのAPI接続先を http://localhost:18000/api に変更（VScodeの.env書き換え）
- Reactとの接続
- 動作確認後　API接続先URLを戻す

#### systemd設定とnginx導入
##### systemd
- systemd設定の意味：アプリのクラッシュ時の再起動など アプリが常時稼働できるようにする
- FastAPI（Uvicorn）、PostgreSQL、Nginxの各サービスの起動や監視をSSH接続をして手動で行わなくてもよい状態にする
- ディレクティブで状況に応じた行動を決める　異常終了時の再起動など
- 詳しくは`Linux-Learning-Notes/Process-Management/systemd/service-files.md`
### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること
- systemd設計

## 2026-10-22
### 作業内容
#### systemd設計
##### Unit
- Description: Description=FastAPI English Quiz Application
- Before/After: After=network.target postgresql.service　ネットワーク、postgre起動後に起動
- Reqires/Wants: Wants=postgresql.service
##### Service
- User=webquiz
- Group=webquiz
- WorkingDirectory=（CLI版と同じように`/opt`配下などで書きこみ出来ないようにする）
- ExecStart=(同じく`/opt`配下に.venvを置き、python3コマンドでuvicorn) 
- Restart=on-failure　異常時に再起動
- RestartSec=5
- NoNewPrivileges=yes　プロセスの権限取得を制限
##### Install
- WantedBy=multi-user.target　マルチユーザーターゲットでのLinux起動時に同時に起動（復旧の時には起動しない）

#### アプリファイル環境構築
- アプリ用ユーザーの追加　` sudo useradd --system -M -s /usr/sbin/nologin -U webquiz`
- dirの作成 ` sudo mkdir /opt/dirname` ＊先に入れ物を作る
- アプリの移動 ＊sudo + no-group no-permsで所有者が引き継がれず、rootになる。excludeで不要ファイルを除外
```
sudo rsync -av \
  --no-owner --no-group --no-perms \
  --exclude='venv/' \
  --exclude='.venv/' \
  --exclude='.env' \
  --exclude='__pycache__/' \
  ~/project/backend/ \
  /opt/app-name/
```
- アプリ権限の変更　グループを専用ユーザーのグループにして権限の設定
- ディレクトリの設定　
`sudo chown root:<app-group> /opt/webquiz
sudo chmod 750 /opt/webquiz`
```
ファイルの設定：（失敗）
sudo chown root:<app-group> /opt/webquiz/*.py
sudo chmod 640 /opt/webquiz/*.py'

理由：権限を750にしたことで、メインユーザーが`/opt/webquiz`から`*.py`を展開できなくなったから
対処：
sudo bash -c 'chown root:<app-group> /opt/webquiz/*.py && chmod 640 /opt/webquiz/*.py'
```
#### 実行環境内にPython仮想環境構築
- `sudo python3 -m venv /opt/webquiz/.venv` で`.venv`を作成
- アプリのVPS移行時の`requirements.txt`を流用して`.venv`にpythonライブラリをインストール
`sudo /opt/webquiz/.venv/bin/python3 -m pip install -r /opt/webquiz/requirements.txt`
- 依存関係のcheck
`sudo -u webquiz /opt/webquiz/.venv/bin/python3 -m pip check`

#### .envファイルの移行
- `.env`を`/opt/webquiz`にコピー
`sudo cp .env /opt/webquiz/.env`
- 所有者、権限がスライドされるので所有者、権限の変更
```
sudo chown root:<app-group> /opt/webquiz/.env
sudo chmod 640 /opt/webquiz/.env
```

#### servicefile完成
- pathが決まったので残りを完成させる
```
WorkingDirectory=/opt/webquiz
ExecStart=/opt/webquiz/.venv/bin/python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
```

- ファイルの構文をチェックする
`sudo systemd-analyze verify /etc/systemd/system/webquiz.service`

- systemdに設定を読み込ませる
`sudo systemctl daemon-reload`

- サービスを起動、確認する
```bash
sudo systemctl start webquiz
sudo systemctl status webquiz
```

- enableにする
`sudo systemctl enable webquiz`

- activeかenableか確認する
```
sudo systemctl is-active webquiz
sudo systemctl is-enabled webquiz
```

### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること
- systemdによるAPIの動作確認、Nginxの導入・設定

## 2026-10-23
### 作業内容
#### APIの確認
- SSHポートフォワーディングで確認
#### Nginx導入
- インストール　`sudo apt install nginx`
- statusチェック`sudo systemctl status nginx --no-pager`
- 応答確認　`curl -I http://127.0.0.1`
### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること
- nginxファイル設定

## 2026-10-24
### 作業内容
#### nginxファイル設定
##### サブドメインの取得
- Duck DNSにログイン
- sub domain欄にドメインを入力、追加
- VPSのIPアドレスを登録（固定グローバルIPアドレス）
- ドメインとIPアドレスが紐づけされる
- `getent ahostsv4 サブドメイン.duckdns.org`でチェック
### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること
- nginxファイル設定続き

## 2026-10-25
### 作業内容
#### nginx導入法決定
- HTTPで外部公開せずにリバースプロキシの設定、テスト
- SSL/TLS証明書を取得、設定してHTTPSにして公開の計画
#### nginxファイル設定
##### サーバーブロックの設計
- 80番ポートでipv4/v6を待ち受ける
```
server {
        listen 80;
        listen [::]:80;
        sever_name  domain名.duckdns.org;
}
```

##### location設定
- locationは`/api/`以下にFastAPIのエンドポイントを定義してあるので、`/api/`の時にはリバースプロキシでVPSのFastAPIに転送し、それ以外は静的コンテンツを見せるように設定
- 静的コンテンツの置き場の指定は、`root``alias`があるが、送るコンテンツは１種類で置き場を分ける必要が無いので`root`を使用する 
- timeoutはデフォルトの60sで十分
- 静的コンテンツの設定で最初のホーム画面から `/quiz`画面に移行する操作に対応できるうように設定する必要がある。
```
location /api {
        proxy_pass http://127.0.0.1:8000;
}

location / {
        root /var/www/webquiz;
}
```

##### その他設定
- client_max_body_sizeはデフォルトの1MBにする
#### Nginx導入
- - 設定ファイルの有効化 `sudo ln -s /etc/nginx/sites-available/webquiz /etc/nginx/sites-enabled/webquiz`
- 構文チェック　`sudo nginx -t`
- 成功まで修正
- 起動`sudo systemctl start nginx`
- チェック `sudo systemctl status nginx --no-pager`
- active,enabled確認
- curlによる起動確認
```
read -rsp "Password: " $QUIZ_PASSWORD　#見えないようにパスワードを変数に
curl -i \
  -H "Host: my-webquiz.duckdns.org" \
  -H "enterd-password: QUIZ_PASSWORD" \
  "http://127.0.0.1/api/quiz?attempt_count=2"
```
### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること
- フロントエンド移行

## 2026-10-26
### 作業内容
#### フロントエンド移行
##### 移行方針
- ローカルで`build`した静的コンテンツをVPS上にコピーする
- VPS上での変更や開発を行わないため
##### 移行作業
- 本番用の環境変数を用意する
- Viteが読み込む、ReactのAPI接続先のURLを変更する
- 本番環境用`.env.production`を作る
`VITE_API_BASE_URL=/api` ＊Nginxでフロントエンドとバックエンド両方を扱っているから、ドメインを含めたURLではなく、そのドメインに続くパスだけを指定すればいい
- 変更後の本番環境で`npm run build`で静的コンテンツを作る
- 作ったファイルがある`dist/`をVPSに移行する` scp -i 鍵 -r dist ユーザー@VPSのIP:保存先`
- `dist`の中身をNginx設定ファイルで指定した`/var/www/webquiz`以下にコピーする
`sudo cp -r dist/* /var/www/webquiz/`
#### nginxファイル設定変更
- フロントエンドのReactが正しく動くように設定を変更
- Reactの画面遷移は、`dist/index.html`を共通の入り口として`dist/assets/`内のJavaScriptを読み込み、React RouterがURLのパスに応じた画面を表示するという仕組み
- この画面遷移を利用して、「挑戦する」を選択したら`/quiz`にURLが移動、画面の切り替えという仕組みを使っていた
- 普通、この`/quiz`への移行時にはNginxにリクエストが送られないが、直接アクセスしたりページの更新をするとリクエストが送られる
- そうなるとNginxは`/quiz`に対応するもの探して、見つけられずにエラーが起きる
- だから、設定ファイルに存在しないリクエストが来た時に絶対に`index.html`を返すようにすることでフロントエンドが表示されるようにする
```
    location / {
            root /var/www/webquiz;
            try_files $uri $uri/ /index.html; #追加
    }
```
- rootの位置の変更　rootとindexをサーバーブロックに記入　
```
  root /var/www/webquiz;
  index index.html;　#追加　rootのディレクトリにアクセスしたときのデフォルトのファイルを指定
```
- 構文確認と設定反映
```
sudo nginx -t
sudo systemctl  start nginx ＊停止していた
```
#### フロントエンドのチェック
- curlでレスポンスチェック
`curl -I -H "Host: my-webquiz.duckdns.org" http://127.0.0.1/`
`curl -I -H "Host: my-webquiz.duckdns.org" http://127.0.0.1/quiz`
- SSHポートフォワーディングで接続し、Webサイトで確認
`ssh -i key -N -L 127.0.0.1:8000:127.0.0.1:80 user@ip`
- 「Welcome to nginx!」が表示される　デフォルト状態
- Nginxの`server_name`が外部Web用のドメイン名だけだったので、localhostをホスト名とするリクエストがserverブロックに一致せず、Nginxのデフォルトサイトが選択された
- Nginxの`server_name`にlocalhostを追加
`server_name  my-webquiz.duckdns.org localhost;`
- 構文チェック後、サービスをリロード
- 再度127.0.0.1:8000を開きチェック
- 接続成功
- 「挑戦する」を選択したときの画面遷移、`/quiz`への移行　成功
- `/``/quiz``/その他`でURLを入力し、  `/quiz`の時以外は挑戦画面が表示　URLによる直接アクセス、SPA成功
- アプリ実行　成功
#### パッケージの刷新、脆弱性対策
- Node.jsの脆弱性の記事をきっかけに、開発環境全体のパッケージの脆弱性やバージョンを確認することにした
- Node.jsの脆弱性の記事をきっかけに、開発環境全体のパッケージの脆弱性やバージョンを確認することにした
```
node -vでバージョンを確認 → v18.19.1でサポート終了済みと判明
nvm（Node Version Manager）を導入し、Node.jsを管理できるようにした
nvm install nodeで最新版のNode.js v26.12.1をインストール
nvm alias default 26.12.1でデフォルトのバージョンに設定
npm run buildでReactアプリが正常にビルドできることを確認
npm auditで依存パッケージの脆弱性を調査
npm audit fixでViteなどの脆弱性を修正
残ったReact Routerの脆弱性はCodexを使用して7.18.4に更新
最終的にnpm auditで脆弱性0件、npm run buildの成功を確認
```
- 他の脆弱性についてはcodexから調査をし、以下の脆弱性が見つかった
- FastAPIの管理APIに認証・認可が無い
- pip 24.0に複数の脆弱性
- APIの入力制限がない

### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること
- 脆弱性対処

## 2026-10-27
### 作業内容
#### 脆弱性対応
##### API認証
- 実際に攻撃してみる
` curl -X PUT -d {"id":53,"word":"tangerine","meaning":"タンジェリン"} -H "Host: my-webquiz.duck
dns.org" http://127.0.0.1/api/data` JSON形式指定間違いにより失敗
`murabito@ik1-429-46835:~$ curl -X PUT -H "Content-Type: application/json" -d '{"id":53,"word":"tangerine","meaning":"タンジェリン"}' -H "Host: my-webquiz.duckdns.org" http://127.0.0.1/api/data` Content-Typeの指定し、データ部を''で囲っていないことによって{}を展開し、URLと勘違いした問題を解消した。
- フロントエンドに入口が無くても`curl`などでAPIを直接送れば操作できることが分かった
- APIキー認証の導入
- fastapi.securityのAPIKeyHeaderと挑戦者用と同様のAPI認証を組合わせた形式
```
from fastapi.security import APIKeyHeader

header_scheme = APIKeyHeader(
    name="data-change-key",
    description="API key required to add, update, or delete data",
    auto_error=True
)
```
- key: str = Depends(header_scheme)の依存関係でHTTPヘッダーからAPIキーを取得し、正しいキーと照合する関数`def authorize_data_change`、.envにデータ変更用の環境変数、データ変更用のヘッダーと環境変数の認証関数が入ったファイル`from data_change_auth import dcpassword_auth`を用意する
- 各関数に適用する
- FastAPIのdocsで確認する→Authorizeの項目が追加される
- .env_exampleに`API_PASSWORD =`を追加

##### pipの脆弱性検証
- Ubuntuの`apt policy`によってpipのver.24.0が標準とされていた。それを利用していたから仮想環境のpipも24.0だった
- 古いバージョンでも、Ubuntu側でセキュリティ修正を適用する（バックポート）場合がある。
- Pythonの仮想環境（`.venv`）は、作成時にUbuntuが提供するpipを利用することがある。
- 既存の仮想環境内のpipは、OS側のパッケージ更新によって自動更新されるわけではない上に、仮想環境内のpipはOS側と独立して更新できるため、最新版にする

`.venv/bin/python -m pip install --upgrade pip`

- 依存関係を確認
`.venv/bin/python -m pip check`
- pip-auditをインストール
`.venv/bin/python -m pip install pip-audit`
- pip-auditで脆弱性を検出
`.venv/bin/python -m pip_audit`
- 見つからなかった
- /docsで動くかチェック

##### 脆弱性対応のVPS適用
- `/dist`の再移行 scp→diff→cp
- gitを経由したバックエンド変更の適用
```
pull→　　”main.py、data_change_auth.py”を/opt配下にコピー
.envの変更
systendサービスの再起動
```
- pipのアップデート　/opt配下
- SSHポートフォワーディングでチェック　

### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること
- SSL/TLS証明書取得

## 2026-10-28
### 作業内容
#### 昨日の残り
- FastAPIの認証をＶＰＳ上でチェックするのを忘れていた
- ＳＳＨポートフォワーディングを8000番に繋げて  /docsで確認

#### HTTPS化
-  CertbotでLet's Encryptから継続的に証明書を取得できるようにする
##### Certbot導入
- snapのインストール（パッケージ管理システム）　`sudo apt install snapd -y`
- snapアプリの実行用の環境`core`をインストール`sudo snap install core`
- coreを最新版に更新`sudo snap refresh core`
- certbotのインストール`sudo snap install --classic certbot`
- シンボリックリンクを`/usr/bin`に対応付けて環境変数PATHから使いやすくする`sudo ln -s /snap/bin/certbot /usr/bin/certbot`
##### SSL/TLS証明書の発行
- DNSが作動しているか確認 `dig my-webquiz.duckdns.org +short`　自分のIPアドレスが出たらOK
- 80番ポートの解放`sudo ufw allow 80/tcp`
- さくらVPS側のマネジメントコンソールからパケットフィルターで80,443番の解放
- SSL/TLS証明書の発行`sudo certbot --nginx -d my-webquiz.duckdns.org`
`/etc/letsencrypt/live/my-webquiz.duckdns.org/`に秘密鍵と証明書が保存
##### HTTPS化チェック
- 更新できるかチェック`sudo certbot renew --dry-run`
- 自動更新タイマーが稼動しているかチェック`systemctl list-timers |grep certbot`
- Webサイトにhttpsでアクセス
- Webサイトの`/や/quiz,/その他`にhttpでアクセスし、全てhttpsにリダイレクトされているかチェック

#### 最後の修正
- HTTPSへのリダイレクト設定の置き場`# Redirect HTTP to HTTPS`をあらかじめ作っていたがCertbotが自動で作ってくれたので、そこに合うように位置を変更した

#### Webサイト動作確認
- `https://my-webquiz.duckdns.org/`にアクセスし、画面遷移確認
- `https://my-webquiz.duckdns.org/quiz`に直接アクセスして確認
- 

### 設計・判断
### 学んだこと
### エラー・解決
- SSHポートフォワーディング停止後もクイズ画面が表示される
原因：ブラウザに読み込み済みのReact画面が残っていた
解決：Ctrl + Shift + Rで強制再読み込みし、接続状態を確認
### 次回やること

## 2026-10-29
### 作業内容
#### OAuth2.0,OIDC導入
- OAuth,OIDCのイメージ：OAuthは竿・針・アクセストークン用の餌を提供、OIDCは追加のIDトークン用の針と餌を提供する。さらに、IDトークンの餌で釣れる魚の種類が多いから、どの種が誰のものなのかを確認するための図鑑も追加する。実際に竿や餌を使って釣るのはGoogleで、FastAPIがOIDCのやり方でGoogleに依頼してトークンを受け取り、図鑑を使ってIDトークンの正しさや「誰か」を確認する。
- 詳しい学習記録：[OAuth-OIDC-Study-Log](https://github.com/okachi0123-design/OAuth-OIDC-Study-Log)
### 設計・判断
- AWSへの移行前に、Google OAuth 2.0 + OIDCによるログイン認証を導入する。
- PostgreSQLで利用者ごとのデータを管理し、各利用者が独自の単語データを登録して、オリジナルクイズを作成・実施できるようにする。
### 学んだこと
### エラー・解決
### 次回やること
- OAuth導入

## 2026-10-30
### 作業内容 
#### OIDC導入計画
- 動画を参考に既存のFastAPIアプリに、Authlibを使用してGoogleログインを導入する。
- 認証ライブラリとしてAuthlibを採用
- 環境が最も近い動画 [FastAPI Tutorial • Implement GOOGLE SIGNIN LIKE A PRO](https://www.youtube.com/watch?v=5h63AfcVerM) を参考にする。
- セキュリティなど別途必要な技術も追加で導入する
- `/`の「挑戦する」を押した後のReactの画面遷移でログイン`/login`に繋がるようにする
- ログインの流れのためにシークレットモードで"X"や"Youtube"などを確認　"X"はいきなりログイン画面、"Youtube"はメニュー内にログインボタン　今後、説明・挑戦・記録・単語追加ボタンをそれぞれ追加する予定なので"Youtube"形式に決定
#### OIDC導入
##### Authlibの導入

- AuthlibのOAuthクライアント機能を読み込む
`from authlib.integrations.starlette_client import OAuth`
- OAuthクライアントの管理オブジェクトを作成
`oauth = OAuth()`
- Googleを認証先として登録する
**Authlibに対して、認可リクエストを作成する際に必要な情報などを事前に登録する**
- `oauth.register(キーと値)`


###### Google OIDCの設定

```python
oauth = OAuth()

oauth.register(
    name="google", #Authlib内部での登録名
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration", #OIDC DiscoveryのURL　Googleが提供するOIDC設定情報の自動取得用URL
    client_id=CLIENT_ID, #クライアントID
    client_secret=CLIENT_SECRET, #コンフィデンシャルクライアントの認証用秘密情報　認可コードをトークンに交換するときのクライアント認証で使用　
    client_kwargs={
        'scope': 'email openid profile', #権限
        'redirect_url': 'http://localhost:8000/auth', #ユーザーが認証を了承した後、認可コードを認可サーバー→クライアントに送るときの宛先　開発用localhost
    }
)
```


### 設計・判断
### 学んだこと
### エラー・解決
### 次回やること
- 続き

## 2026-10-31
### 作業内容
#### OIDC導入
##### ログインエンドポイントの設定
- ログインボタンを押した直後"/login"の設定
```
@app.get("/login")  # Googleログインを開始するエンドポイントを登録
async def login(request: Request):  # /loginアクセス時に実行される非同期関数
    url = request.url_for("auth")  # 認可コードの受け取り先（redirect_url）を取得
    return await oauth.google.authorize_redirect(request, url)  # ブラウザをGoogleの認可サーバーへリダイレクト
```
##### 環境見直し
###### authlibインストール
- 上をwebサーバーで確認しようとしたとき、authlibライブラリのインストールを忘れていたため、動画の`requirements.txt`から`fastapi-authlib`のインストールを決定
- 動画内では`fastapi-authlib`をインストールし、`authlib`はその依存関係でインストールしていたが、`fastapi-authlib`が要求するライブラリの環境が古く、以下のライブラリがダウングレードされた
```
  Attempting uninstall: sqlalchemy
    Found existing installation: SQLAlchemy 2.0.52
    Uninstalling SQLAlchemy-2.0.52:
      Successfully uninstalled SQLAlchemy-2.0.52
  Attempting uninstall: pydantic
    Found existing installation: pydantic 2.13.4
    Uninstalling pydantic-2.13.4:
      Successfully uninstalled pydantic-2.13.4
  Attempting uninstall: h11
    Found existing installation: h11 0.16.0
    Uninstalling h11-0.16.0:
      Successfully uninstalled h11-0.16.0
  Attempting uninstall: uvicorn
    Found existing installation: uvicorn 0.52.4
    Uninstalling uvicorn-0.52.4:
      Successfully uninstalled uvicorn-0.52.4
  Attempting uninstall: starlette
    Found existing installation: starlette 1.6.0
    Uninstalling starlette-1.6.0:
      Successfully uninstalled starlette-1.6.0
  Attempting uninstall: fastapi
    Found existing installation: fastapi 0.141.1
    Uninstalling fastapi-0.141.1:
      Successfully uninstalled fastapi-0.141.1

Successfully installed Mako-1.4.3 MarkupSafe-3.0.4 PyMySQL-1.2.3 aiomysql-0.1.1 alembic-1.19.2 authlib-1.9.1 cffi-2.1.1 cryptography-50.0.2 dynaconf-3.3.5 fastapi-0.95.2 fastapi-authlib-0.0.4 fastapi-sa-0.1.0 h11-0.14.0 httpcore-0.17.3 httpx-0.24.1 inflection-0.5.1 itsdangerous-2.2.0 joserfc-1.7.7 pycparser-3.12 pydantic-1.10.27 pyjwt-2.15.1 sniffio-1.3.1 sqlalchemy-1.4.46 starlette-0.27.0 uvicorn-0.21.1
```
- そのため、`fastapi-authlib`と依存先の`fastapi-sa`をアンインストールし、`authlib`本体の利用に変更した

###### client_id,secret用のconfigファイル追加
- 同じくwebサーバーを開く際に、`CLIENT_ID, CLIENT_SECRET`のconfigファイルを作っていないことに気づいた
- 新たにconfファイルを追加し
```
from dotenv import load_dotenv
import os

load_dotenv()

CLIENT_ID = os.getenv("AUTH_CLIENT_ID")
CLIENT_SECRET = os.getenv("AUTH_CLIENT_SECRET")
```
- .env,.env_exampleに↓を追加した
```
AUTH_CLIENT_ID=

AUTH_CLIENT_SECRET=
```
##### ログインエンドポイントの設定続き
- webサーバー起動成功後　`/docs`でlogin追加を確認
- URLパスに`/login`を追加して、存在することを確認 `Internal Server Error`
### 設計・判断
### 学んだこと
### エラー・解決

### 次回やること
- `/auth`導入

## 2026-11-01
### 作業内容
#### OIDC導入
##### /auth導入
- `/login`後認可コードを受け取る場所`/auth`を用意
```
@app.get('/auth') #認可コード受け取り場所 /auth
async def auth(request: Request): #認可コードを受け取り、送信してトークンを取得する関数
    try:
        token = await oauth.google.authorize_access_token(request) #非同期で認可コードを送りアクセストークンのリクエストを送る
    except OAuthError as e: #エラー時の処理　as e:エラー内容を変数eに保存
    
        raise HTTPException(
              status_code=400,
              detail="認証に失敗しました"
        ) #HTTPステータス（400エラー）とエラーメッセージ
    user = token.get('userinfo') #トークンの取得結果からuserinfoを取り出し、変数userに保存
    if user: #userあれば
        request.session['user'] = dict(user) #user情報を辞書にして、セッションに保存
        return "認証に成功しました"
    raise HTTPException(
                status_code=401,
                detail="ユーザー情報が見つかりませんでした"
    ) #HTTPステータス（401エラー）とエラーメッセージ
```
- SessionMiddleware導入
- ↑保存後`SessionMiddleware must be installed to access request.session`と出た
- Cookieを使用したセッション管理を導入する
```
from starlette.middleware.sessions import SessionMiddleware
app.add_middleware(SessionMiddleware,secret_key="COOKIE管理用秘密鍵")
```
- 完了後、`/docs`でチェック　関数が動いていることを確認
`"GET /auth HTTP/1.1" 400 Bad Request`
`"detail": "認証に失敗しました"`
##### ユーザー情報照合の導入
###### 設計
- ↑の関数では、Googleからユーザー情報が届きさえすれば完了する設計ということに気づいた
- `userinfo`から何らかのキーを取りだして、ユーザー情報を保存したDBに検索を掛ける仕組みの導入が必要
- userinfo(dict)に保存されるIDトークンのフォーマットが以下のJWT形式と学んだ 
```
ヘッダーには署名用の鍵kidとアルゴリズムalg,ペイロードにはユーザーのメールemail,トークンの発行者URLiss,認可サーバーからのユーザー識別子sub,クライアント識別子aud,有効期間終了日時exp,発行日時iat
```
- `sub`と`UID`を結びつけるDBの設置、今後個別データ追加時にUIDを単語のDBに追加が必要
- subでDBに検索をかける関数`identify_user()`を`identify_user.py`に追加　引数にsub登録
```
sub = user.get('sub')
uid = identify_user(user.sub)
```
###### テーブルの追加
- テーブル構造：モデルが`sub,uid,is_allowed`でis_allowedの○×を手動で決める
- モデル設計
- pydantic
```
class Users(BaseModel):
    sub: str
    uid: int
    is_allowed: bool 
```
- SQL
```
class SQLclassUsers(Base):

    __tablename__ = "webquiz_users"

    sub = Column(String)
    uid = int Column(Integer, primary_key=True, index=True)
    is_allowed = Column(Boolean)
```
- is_allowedを手動にする方法を考える
- 追加時は自動でfalseになる`default=False`
- Nullの状態での保存を禁止する`nullable=False`
- を追加することでFalse以外で保存されないようにする
`is_allowed = Column(Boolean, default=False, nullable=False)`
- subの設定
- `nullable=False`をsubにも追加する必要があると思い、subの設定を考え直した
- `nullable=False`と二重登録を防ぐ`unique=True`を追加
`sub = Column(String,  nullable=False, unique=True)`
- テーブルの確認
`sql_dbmodels.Base.metadata.create_all(bind=engine)`でモデルの保存後自動でテーブルが追加されるので追加後、pgadminで各種設定を確認
###### 関数の作成
- identify_user.py
```
from sqlalchemy.orm import Session
import sql_dbmodels

def identify_user(sub: str,db: Session):
    user_data = db.query(sql_dbmodels.SQLUsers).filter(sql_dbmodels.SQLUsers.sub == sub).first()
    return user_data
```
- main.py　@app.get('/auth')を変更
```
@app.get('/auth') #認可コード受け取り場所 /auth
async def auth(request: Request, db: Session = Depends(get_db)): #認可コードを受け取り、送信してトークンを取得する関数
    try:
        token = await oauth.google.authorize_access_token(request) #非同期で認可コードを送りアクセストークンのリクエストを送る
    except OAuthError as e: #エラー時の処理　as e:エラー内容を変数eに保存
    
        raise HTTPException(
              status_code=400,
              detail="認証に失敗しました"
        ) #HTTPステータス（400エラー）とエラーメッセージ
    user = token.get('userinfo') #トークンの取得結果からuserinfoを取り出し、変数userに保存
    if user: #userあれば
        sub = user.get('sub')
        if sub:
            user_data = identify_user(sub, db)
            if user_data:
                if user_data.is_allowed == True:
                    request.session['uid'] = user_data.uid #user情報からuidを見つけて、セッションに保存
                    return "認証に成功しました"
                else:
                    raise HTTPException(
                        status_code=403,
                        detail="認証が許可されていません"
                        )
            else:
                db.add(sql_dbmodels.SQLUsers(sub=sub, is_allowed=False))
                db.commit()
                raise HTTPException(
                        status_code=403,
                        detail="ユーザー情報を送信しました。管理者の許可をお待ちください。"
                        )
        else:
            raise HTTPException(
                status_code=401,
                detail="正確なユーザー情報の取得に失敗しました"
                )
    raise HTTPException(
                status_code=401,
                detail="Googleからユーザー情報を取得できませんでした"
    ) #HTTPステータス（401エラー）とエラーメッセージ
```
- 変更箇所
```
#DBセッションを引数に追加
async def auth(request: Request, db: Session = Depends(get_db)):

#Googleのsubを取得してDBと照合
sub = user.get('sub')
if sub:
    user_data = identify_user(sub, db)
    if user_data:
        if user_data.is_allowed == True:
            request.session['uid'] = user_data.uid
            return "認証に成功しました" #ユーザー認証に条件追加、cookieセッションに保存する情報の変更 全データuser→uidのみ
        else:
            raise HTTPException(
                status_code=403,
                detail="認証が許可されていません"
            )
    else:
        db.add(sql_dbmodels.SQLUsers(sub=sub, is_allowed=False))
        db.commit()
        raise HTTPException(
            status_code=403,
            detail="ユーザー情報を送信しました。管理者の許可をお待ちください。"
        ) #subがDBにない時、subとuid（自動割り振り）を仮登録するようにした
else:
    raise HTTPException(
        status_code=401,
        detail="正確なユーザー情報の取得に失敗しました"
    )

#トークン取得失敗時のエラーメッセージの変更　他との区別
 raise HTTPException(
                status_code=401,
                detail="Googleからユーザー情報を取得できませんでした"
    )

```
### 設計・判断
- 新テーブルの追加をDBで分けるかテーブルで分けるか
- 結論：テーブルで分ける
- 理由：
- SQLAlchemyのORMを使用しており、SQLインジェクションを受けにくい構造
- DBの接続情報が流出する経路を考えたときに、.envの漏洩、通信の盗聴、ログへの誤出力、GitHubへの誤公開、サーバーへの不正侵入があるが、これらの事態になった時に、DBを分けていてもセキュリティ面の効果があまり発揮されない
- バックアップの漏洩だけDB分離の効果があるが、テーブルごとのバックアップのような設計で対処可能
- DB分離によるセキュリティ上の効果を高めるには、認証情報・アクセス権限・ネットワーク・実行環境などの分離も必要になる
- 同じDB内でもテーブル単位でアクセス権限を制限できる
### 学んだこと
### エラー・解決
### 次回やること
- トークンなしで引数を送ってテスト
- Google側設定

## 2026-11-02
### 作業内容
#### 新テーブルと関数のテスト
- 一時的にテスト用関数の用意
```
@app.post('/auth') #認可コード受け取り場所 /auth
async def authtest(request: Request, user: Users, db: Session = Depends(get_db)): #認可コードを受け取り、送信してトークンを取得する関数
    
    if user: #userあれば
        sub = user.sub
        if sub:
            user_data = identify_user(sub, db)
            if user_data:
                if user_data.is_allowed == True:
                    request.session['uid'] = user_data.uid #user情報からuidを見つけて、セッションに保存
                    return "認証に成功しました"
                else:
                    raise HTTPException(
                        status_code=403,
                        detail="認証が許可されていません"
                        )
            else:
                db.add(sql_dbmodels.SQLUsers(sub=sub, is_allowed=False))
                db.commit()
                raise HTTPException(
                        status_code=403,
                        detail="ユーザー情報を送信しました。管理者の許可をお待ちください。"
                        )
        else:
            raise HTTPException(
                status_code=401,
                detail="正確なユーザー情報の取得に失敗しました"
                )
    raise HTTPException(
                status_code=401,
                detail="Googleからユーザー情報を取得できませんでした"
    ) #HTTPステータス（401エラー）とエラーメッセージ
```
- 正常に`sub`が入ったデータ`user`を送信→`status_code=403,"ユーザー情報を送信しました。管理者の許可をお待ちください。"`と出て、pgadminで追加されていること、uidの自動採番、デフォルトのfalseを確認
- subを変更して送信→↑と同様の結果で、自動採番を確認
- 同データを再度送信→`403,detail="認証が許可されていません"`でfalseの確認
- pgadminで許可後、登録済み`sub`の入ったデータを送信→`200 "認証に成功しました"`
- `sub`を`""`で空にして送信→` 401,detail="正確なユーザー情報の取得に失敗しました"`
- 引数を`user:　Users | None = None`に変更して、データを`null`にして送信→
  `401,detail="Googleからユーザー情報を取得できませんでした"`

#### Google設定
- googlecloudconsoleにログインし、新しいプロジェクトを選択して、作成する
`URL:https://console.cloud.google.com`
- 各種設定
- Google Auth Platform
```
１．検索でGoogle Auth Platformを調べて開く
２．開始を選択して、設定項目を入力　アプリ情報→対象（外部）→作成
３．テストユーザーの追加
４．クライアントの作成
種類：WEBアプリ
　　　承認済みの JavaScript 生成元　なし　
　　　承認済みのリダイレクト URI　http://localhost:8000/auth
↑　構造上、Javascriptで直接ログイン手順を引き出すよりも、apiを介して行った方が、後のuid識別機能と組み合わせやすい
５．作成後、client_idとclient_secretを.envに保存
```
- 認証テスト
- `Missing "authorize_url" value`でurlに問題あり
- `server_metadata_url=''`にURIを追加が必要
`server_metadata_url='https://accounts.google.com/.well-known/openid-configuration'`#OIDCサービスを使用するためのディスカバリドキュメントのURI
- 再度テスト`アクセスをブロック: このアプリのリクエストは無効です　エラー 400: redirect_uri_mismatch`　←詳細↓エラー・解決
- エラーを解決し再度テスト
- ログイン画面表示→ログイン→`{"detail":"ユーザー情報を送信しました。管理者の許可をお待ちください。"}`
- DBの確認　追加されて、`uid,is_allowed`設定も成功
- trueにして再度ログイン成功

#### 関数にログイン依存の追加
- ログインと`is_allowed`を確認する関数の追加
- パス認証の数字だけ返す方法→ステータスコード、メッセージを返す方法に変更
- 理由：エラーの種類が多く、各々にifをしたらコードが長くなる
```
def login_checker(request: Request, db: Session = Depends(get_db)):
    uid = request.session.get('uid')
    if uid:
        permission = db.query(sql_dbmodels.SQLUsers.is_allowed).filter(sql_dbmodels.SQLUsers.uid == uid).scalar()
        if permission == True:
            check_result = 1
            return check_result 
        elif permission == False:
            raise HTTPException(
                        status_code=403,
                        detail="認証が許可されていません"
                        )
        else:
            raise HTTPException(
                status_code=401,
                detail="ユーザー情報が登録されていません"
                )
    else: 
        raise HTTPException(
                status_code=401,
                detail="ログインしてください"
                )
```
- Dependsにして追加
`login_check_result: int = Depends(login_checker)`
`if login_check_result == 1:`
- 全関数のチェック
```
ログイン済みcookie(True):全関数OK
ログイン済みcookie(False):全関数OK
非ログインcookie:全関数OK
＊ログイン済み（Null）チェックできなかった
→ログイン済み（Null）チェック方法：ログイン後テーブルからユーザー情報削除
結果：全関数OK
```
#### パスの変更
- `/login``/auth`を`/api/login``/api/auth`に変更しテストした
- コードのパス、google cloud consoleのクライアントのリダイレクトURLを変更

#### codexによるフロントエンド開発
‐ 命令の方針　バックエンドには触らせない、
- 命令文
```

【命令】

あなたの仕事は、~/English_vocab_quiz/web/vps-web/frontendを書き換えて、Googleログインのボタンを追加することです。

【実現すべきこと】

・/にログインボタン追加、ログインボタンを押すと/api/loginに移動するようにしてください

・/の内容を説明文（オリジナル英単語クイズです。挑戦するにはGoogleログインと管理者による利用許可が必要です。）の下にメニュー、挑戦する、（前回結果、問題追加）←Coming Soon、ログインのボタンを作って選択する形にしてください

・def login_checkerにおいて、HTTPエラー発生時のReactによる「/」へのリダイレクト


【条件】

・変更箇所は最後に説明してください

・認証情報やパスワードの置き場所は最後に説明してください

・バックエンドには基本手を加えず、必要になった場合は全ての処理を中断、終了したのち聞いてください

・既存の画面遷移、問題数指定、クイズ取得・採点機能を維持すること

・「前回結果」「問題追加」はComing Soonとして表示し、機能は実装しないこと

・Client Secret、パスワード、セッション秘密鍵などをフロントエンドに記述しないこと

・バックエンドのコードは変更しないこと。変更が必要になった場合は、その理由を説明し、ユーザーの許可を待つこと

・作業後は変更したファイルと内容、実施したテスト、未完了の作業を報告すること


【今回のバックエンド変更点】

・OIDCの追加

・OIDCのIDトークンを利用して個人を認証し、uidを発行、識別する機能

・認証の流れ
/api/loginでGoogleに認可コードの送り場所を示し、認可サーバーにリダイレクトした後、/api/authで認可コードを受け取り、トークンのリクエストの送信、subによる個人識別を行う

・また、クイズで扱うAPIはdef login_checkerに依存しており、ここでユーザーがログインしているか、許可設定されているかを監査する。ログインされていない、許可されていないなどの時はHTTPエラーとエラーメッセージが送信される。このエラーメッセージを表示するとともに、HTTPエラー時には「/」にリダイレクトされるようにReact側で設定を行う必要がある


【完了条件】

・実現事項の達成

・脆弱性のチェック
機密情報の漏洩、ログイン先URLの安全性、既存APIへの影響、依存パッケージの既知の脆弱性を可能な範囲

・追加、変更箇所をまとめて説明できるようにする

```
- chatgptの追加案
```
【ChatGPTによる追加指示・改善案】

１．ログインボタンの実装

・ReactからFastAPIの/api/loginへは、通常のブラウザ画面遷移でアクセスすること

・開発環境ではhttp://localhost:8000/api/login、本番環境では/api/loginへ遷移させること

・既存のVite設定やAPI接続方式を確認し、可能な限り再利用すること

・ログインボタンの追加に伴い、既存の「挑戦する」から/quizへの遷移を変更しないこと


２．HTTPエラー処理と画面遷移

・GET /api/quizとPOST /api/quizでHTTP 401・403が返された場合、React側でエラーを処理すること

・401・403の場合はトップページ「/」へ戻し、FastAPIから返されたエラーメッセージを表示すること

・「/」へ遷移した後もエラーメッセージが失われないようにすること

・HTTP 500や通信障害などは認証・認可エラーと区別し、適切なエラーメッセージを表示すること

・/quizに直接アクセスされた場合も、認証されていないユーザーにクイズデータを表示しないこと


３．セッションCookieの取り扱い

・既存のAPI通信方式を調査し、セッションCookieが必要な通信で正しく送信されるようにすること

・ReactとFastAPIが異なるオリジンで動作する開発環境では、必要に応じてcredentials: "include"などを設定すること

・CORS設定の変更が必要な場合は、バックエンドを変更せず、理由を報告して許可を待つこと

・フロントエンドの表示状態だけで認証済みと判断せず、既存のFastAPI側の認証・認可処理を維持すること


４．Google認証成功後の画面遷移

・現在、FastAPIの/api/authは認証成功時に成功メッセージを返す構成である

・Google認証成功後にReactへ自動的に戻る処理は、今回の実装対象外とすること

・自動リダイレクトの実装にバックエンドの変更が必要な場合は、変更せずに理由を報告すること


５．既存機能の保護

・既存のクイズ取得・採点処理を勝手に削除・変更しないこと

・既存のパスワード認証機能を勝手に削除・変更しないこと

・新しいバックエンドAPIを必要とする機能を勝手に追加しないこと

・既存の画面構成・API通信処理を調査したうえで、最小限の変更で実装すること


６．セキュリティの確認

・Client Secret、セッション秘密鍵、パスワードなどをReactのソースコードやViteの環境変数に記述しないこと

・ログイン先URLが開発環境・本番環境で適切に設定されているか確認すること

・既存APIへの影響や、機密情報がブラウザに公開される可能性を確認すること

・依存パッケージの既知の脆弱性を、可能な範囲で確認すること

・確認できなかった項目は、安全と断定せず、その旨を報告すること


７．テスト・完了条件

・npm run buildなどで、フロントエンドのビルドが成功することを確認すること

・ログインボタンからGoogle認証を開始できるか確認すること

・既存のクイズ取得・採点機能が維持されているか確認すること

・HTTP 401・403を受け取った際の画面遷移とエラーメッセージ表示を確認すること

・HTTP 500や通信障害などの処理を確認すること

・/quizへの直接アクセス時に、未認証ユーザーへクイズデータを表示しないことを確認すること

・テストを実施できなかった場合は、成功扱いにせず、理由と必要な確認方法を報告すること

・作業終了後は、変更したファイル、実装内容、テスト結果、未完了事項をまとめて報告すること

・開発環境（React：localhost:5173、FastAPI：localhost:8000）と本番環境の両方でログイン先が正しくなるようにすること
```

#### SessionMiddlewareの署名鍵の修正

・Codexによるフロントエンドの実装後、SessionMiddlewareの署名鍵に以下のセキュリティ上の問題があると指摘された。

・secret_keyに環境変数ではなく、固定文字列を渡していた。
修正前：`secret_key="SECRET_COOKEY"`これでは環境変数ではなく文字列と認識する
修正後：`secret_key=SECRET_COOKEY`



### 設計・判断
### 学んだこと
### エラー・解決
- リクエスト無効エラー
- 詳細文：認可リクエストで渡された redirect_uri が、OAuth クライアント ID の承認済みリダイレクト URI と一致しません。
- 原因予想：localhost と　http://127.0.0.1:8000/の不一致
→`http://localhost:8000/auth`コードと登録先共に同じ
- 原因予想２：検索時のURLの指定が`127.0.0.1:8000`
→localhostに変更でログイン可能に
- 原因：検索時のURLの指定が`127.0.0.1:8000`でコードと承認済みリダイレクトURIが`localhost`と一致しなかったから
- 解決：`localhost`に統一
### 次回やること
- フロントエンドテスト

## 2026-11-03
### 作業内容
#### フロントエンドテスト
##### ログイン
- 非ログインでの挑戦禁止＋リダイレクト 〇
- Falseでのログイン後のメッセージとリダイレクト ✕（リダイレクト）`400 Bad Request`
- True状態でのログイン ✕ `400 Bad Request`
```
・http://127.0.0.1:5173/からのログイン→失敗
・http://localhost:5173/→成功
詳細は↓エラー・解決
```
- True状態でのログイン(localhost) △ 認証〇 リダイレクト✕
- False状態でのログイン(localhost) △ Google認証〇 利用許可✕ リダイレクト✕
- データなし状態でのログイン △ Google認証〇 仮登録〇 リダイレクト✕

- Reactのリダイレクトが機能していない
  - Reactのリダイレクト→`login_checker`のときだけ
  - auth時のリダイレクトは別途必要

#### 認証後のリダイレクト
- 候補
```
1. FastAPIのGET "/"にlogin_checkerを導入する
2. RedirectResponseでReactへ戻す＋クエリパラメーターで判別
- FastAPIで認証結果を判定
3. FastAPI側でGUI（HTML画面）を用意する
4. HTTPレスポンスヘッダーに認証結果を追加する
- カスタムヘッダーで成功・失敗を区別する。
- Nginxのアクセスログにヘッダー情報を記録する。
5. ログ記録用の関数を別に作成して呼び出す
- 認証結果が確定した時点でログ記録関数を呼び出す。
- その後、Reactへリダイレクトする。
6. async defを使って途中から処理を分ける
- 認証処理とログ記録処理を別の関数に分ける。
- awaitや非同期処理を使って実行することを検討する。
```
- ログ管理しつつ、リダイレクトをしたい
- 2+5で行う
##### 2:RedirectResponseの設定
- 各関数の`raise`を`RedirectResponse`に変更して、パラメータを割り振る
```
           user_data = identify_user(sub, db)
            if user_data:
                if user_data.is_allowed == True:
                    request.session['uid'] = user_data.uid #user情報からuidを見つけて、セッションに保存
                    return RedirectResponse(url="http://localhost:5173/?auth_result=allowed") 
                else:
                    return RedirectResponse(url="http://localhost:5173/?auth_result=denied") 
            else:
                db.add(sql_dbmodels.SQLUsers(sub=sub, is_allowed=False))
                db.commit()
                return RedirectResponse(url="http://localhost:5173/?auth_result=requested") 
        else:
            return RedirectResponse(url="http://localhost:5173/?auth_result=data_failed") 
    return RedirectResponse(url="http://localhost:5173/?auth_result=google_request_failed") 
```
- react側で判断させるために、codexに今回の変更を伝える
```
今回のあなたの仕事は　@app.get('/api/auth')  の結果として送られるクエリパラメータに応じて、reactの画面にメッセージを表示させることです。

変更点
            if user_data:
                if user_data.is_allowed == True:
                    request.session['uid'] = user_data.uid #user情報からuidを見つけて、セッションに保存
                    return "認証に成功しました"
                else:
                    raise HTTPException(
                        status_code=403,
                        detail="認証が許可されていません"
                        )
            else:
                db.add(sql_dbmodels.SQLUsers(sub=sub, is_allowed=False))
                db.commit()
                raise HTTPException(
                        status_code=403,
                        detail="ユーザー情報を送信しました。管理者の許可をお待ちください。"
                        )
        else:
            raise HTTPException(
                status_code=401,
                detail="正確なユーザー情報の取得に失敗しました"
                )
    raise HTTPException(
                status_code=401,
                detail="Googleからユーザー情報を取得できませんでした"
                    return RedirectResponse(url="http://localhost:5173/?auth_result=allowed") 
                else:
                    return RedirectResponse(url="http://localhost:5173/?auth_result=denied") 
            else:
                db.add(sql_dbmodels.SQLUsers(sub=sub, is_allowed=False))
                db.commit()
                return RedirectResponse(url="http://localhost:5173/?auth_result=requested") 
        else:
            return RedirectResponse(url="http://localhost:5173/?auth_result=data_failed") 
    return RedirectResponse(url="http://localhost:5173/?auth_result=google_request_failed") 
‐以上の様にraiseでHTTPステータス＋discriptionで表示していた方法から、リダイレクト＋クエリパラメータでデータを送信する形に変えました。

成功要件

・リダイレクトが可能

・各段階に応じて、それぞれ対応するエラーメッセージが表示されること

・クエリパラメータが存在しない場合通常ページが表示されること

・既存機能が動くかテストを行い、結果を示すこと

条件

・変更箇所の記録必須

・バックエンドには手を付けない

・最小限の変更　既存のコードの確認必要

・表示するメッセージ
auth_result	メッセージ
allowed	ログインに成功しました。
denied	アプリの利用が許可されていません。
requested	ユーザー情報を送信しました。管理者の許可をお待ちください。
data_failed	正確なユーザー情報の取得に失敗しました。
google_request_failed	Googleからユーザー情報を取得できませんでした。
```
- 実装完了後
- テスト(API)
```
True 〇
False 〇
データなし 〇
データなし（別アカウント） 〇
```
‐ テスト（クエリパラメータ直接指定、エラーメッセージと挑戦時の誤って認可されないか）
```
allowed 〇
denied 〇
requested 〇
data_failed 〇
google_request_failed 〇
```
##### 5:ログ関数の導入
- Pythonログの学習→ [logging.md](https://github.com/okachi0123-design/Python-study-log/blob/main/standard-library/logging.md)に記録
- ログ設計
```
認証結果に応じてログレベルとメッセージを変更する。
ユーザーを特定できる場合はuidをログに追加する。
.各ログメッセージ
ERROR：トークンリクエスト送信エラー（e.errorを追加）
INFO：認証成功（uidを追加）
INFO：認証済未許可（uidを追加）
INFO：新規登録（uidを追加）
WARNING：sub取得失敗
WARNING：Googleユーザー情報取得失敗
・uidの記録
既存ユーザーは`user_data.uid`を使用する。
新規ユーザーはDB登録後に再検索し、ログに記録する。
logger.info("認証成功 uid=%s", user_data.uid)のように%sでuidを埋め込む。

```
- ログ記述用ファイル`logger.py`、作成するログ記述関数`auth_logging()`を作成し  import
- 書いてみたらファイルである必要がなかったため、main.pyに直接書きこむ

```
from logging import getLogger, StreamHandler, Formatter, INFO, WARNING

logger=getLogger(__name__) #ログ出力命令
handler=StreamHandler() #ログ出力方法
logger.setLevel(INFO) #扱うログレベルの指定

@app.get('/api/auth') #認可コード受け取り場所 /auth
async def auth(request: Request, db: Session = Depends(get_db)): #認可コードを受け取り、送信してトークンを取得する関数
    try:
        token = await oauth.google.authorize_access_token(request) #非同期で認可コードを送りアクセストークンのリクエストを送る
    except OAuthError as e: #エラー時の処理　as e:エラー内容を変数eに保存
        logger.error("トークンリクエスト送信エラー: %s", e.error)
        raise HTTPException(
              status_code=400,
              detail="認証に失敗しました"
        ) #HTTPステータス（400エラー）とエラーメッセージ
    user = token.get('userinfo') #トークンの取得結果からuserinfoを取り出し、変数userに保存
    if user: #userあれば
        sub = user.get('sub')
        if sub:
            user_data = identify_user(sub, db)
            if user_data:
                if user_data.is_allowed == True:
                    request.session['uid'] = user_data.uid #user情報からuidを見つけて、セッションに保存
                    logger.info("認証成功 uid=%s", user_data.uid)
                    return RedirectResponse(url="http://localhost:5173/?auth_result=allowed") 
                else:
                    logger.info("認証済未許可 uid=%s", user_data.uid)
                    return RedirectResponse(url="http://localhost:5173/?auth_result=denied") 
            else:
                db.add(sql_dbmodels.SQLUsers(sub=sub, is_allowed=False))
                db.commit()
                added_data = identify_user(sub, db)
                logger.info("新規登録 uid=%s", added_data.uid)
                return RedirectResponse(url="http://localhost:5173/?auth_result=requested") 
        else:
            logger.warning("sub取得失敗")
            return RedirectResponse(url="http://localhost:5173/?auth_result=data_failed") 
    logger.warning("Googleユーザー取得失敗")
    return RedirectResponse(url="http://localhost:5173/?auth_result=google_request_failed") 
    #HTTPステータス（401エラー）とエラーメッセージ

```
- テスト
- 失敗　原因`logger.addHandler(handler)`と`handler.setFormatter(formatter)`を忘れていた
- 再テスト
- ログイン済許可、未許可、新規いずれの場合もログがターミナルに表示された
- Warningの２つは調査できなかった
- URLを直接指定した場合は、FastAPIには関係ないためリダイレクトのみ行われた

#### Linuxカーネルの脆弱性対策（CVE-2026-98432）
- ↑を受けて10/30にカーネル更新の対策を行ったが、その時点では今回の脆弱性の対策がなされていなかったので、新たに対策を行った。
- CertbotとVPSへのSSHを使用しているため、TCP通信を完全に遮断することはできない
##### 脆弱性の概要
- CVE：CVE-2026-98432
- 深刻度：CVSS 9.8（Critical）
- LinuxカーネルのIPv4 TCP接続処理におけるUse-After-Free（解放済みメモリの使用）の脆弱性。
- 認証されていない外部の攻撃者によって、リモートコード実行などが発生する可能性がある。

##### 実施した対策（2026/11/03）
- iptablesによる一時的な対策
`sudo iptables -I INPUT 1 -p tcp -m u32 --u32 '0>>24&0x0f=6:15' -j DROP`
- `-I INPUT 1`：INPUTチェーンの先頭にルールを追加。
- `-p tcp`：TCP通信を対象にする。
- `-m u32`：パケットのヘッダー情報を数値として検査する。
- `0>>24&0x0f=6:15`：IPv4ヘッダー長が6〜15（24〜60バイト）のパケットを検出する。
- `-j DROP`：条件に一致したパケットを破棄する。
通常のIPv4ヘッダー長は20バイト（値5）。20バイトより長いヘッダーにはIPv4オプションが含まれる。
今回の脆弱性に関係するIPv4オプション付きTCPパケットを遮断することで、攻撃リスクの軽減を図る。

- ルールの適用確認
`sudo iptables -S INPUT`
実行結果：
```
-P INPUT DROP
-A INPUT -p tcp -m u32 --u32 "0x0>>0x18&0xf=0x6:0xf" -j DROP
```

- Certbotへの影響確認
`sudo certbot renew --dry-run`
実行結果：
```
Congratulations, all simulated renewals succeeded:
  /etc/letsencrypt/live/my-webquiz.duckdns.org/fullchain.pem (success)
```
- 成功

- SSHへの影響確認
- 接続した状態で、新規ターミナルからSSH接続をテスト
- 成功
##### 注意点
- iptablesに直接追加したルールは、再起動やUFWの再読み込みなどで消える可能性がある。
- 根本対策には修正済みLinuxカーネルへの更新と再起動が必要

##### ルールの削除方法
`sudo iptables -D INPUT -p tcp -m u32 --u32 '0>>24&0x0f=6:15' -j DROP`

##### 今後の対応
- テスト段階の最新カーネルの更新をするか否かを考える。
- Ubuntuの修正済みカーネルが正式配布されたら更新する。
- 更新後に再起動し、`uname -r` でバージョンを確認する。
- 修正適用を確認した後、一時対策ルールを削除する。

##### 参考資料
- [Ubuntu公式：CVE-2026-98432](https://ubuntu.com/blog/fixes-available-in-proposed-pocket-for-cve-2026-98432)
- [AWS Security Bulletin](https://aws.amazon.com/security/security-bulletins/2026-160-aws/)

### 設計・判断
### 学んだこと
### エラー・解決
- 400 Bad Request
  - `127.0.0.1:5173`からGoogleログインを開始すると失敗する
  - `localhost:5173`からログインすると成功する

- 究明方法
  - `except OAuthError as e:`でエラー時の例外情報をeとして受け取とっていた
  - `print("OAuth error:", e.error)`でターミナルにエラーを表示

- 原因:→ `mismatching_state`　stateの不一致
- stateはランダムな値を認証時に送信すると同時にセッションに保存することで、OAuthプロバーダーからのコールバック時に別の認証URLとの判別ができる　値の照合が合わなかったら拒否しアラームで伝えることができると学んだ
  → `127.0.0.1:5173/`から認証を開始した際にstateの照合情報を127.0.0.1側のセッションCookieに保存しているけど、redirect URIは`localhost:8000/api/auth`に返す設計になっているから、Cookieが送信されずstateのランダムな合言葉が照合できずにエラーが起きた

- 解決
  - `localhost:5173`に統一してログインする
---
- True→Falseに変更したがログインが通るエラー
- 原因
- pgAdminの画面上では`is_allowed=False`に変更されていたが、実際のDBには反映されておらず、`True`のままだった。
- テーブルを開き直すことで判明した。
- 解決
- 再度`is_allowed=False`に変更して保存。

### 次回やること
- 最終チェック後VPSデプロイ

## 2026-11-04
### 作業内容
#### VPSデプロイ前チェック
##### 変更箇所
- cookie導入
- OAuth2.0を使ったOIDC導入
- /login,/auth,クエリパラメータ導入
- フロントエンドの変更
- ログ機能追加
- 各関数をOAuth準拠に変更
##### セキュリティチェック
**OAuth**
- state:リダイレクトURIのホスト名をlocalhostに設定した認可サーバーに127.0.0.1でリクエストを送った時に、`mismatching_state`とstateの不一致エラーが起こり、作動していることを確認した。
- リクエスト元として127.0.0.1のcookieにstateを保存していたが、コールバック先はlocalhostになっていた
**Nonce**
- Nonce：トークンが誰のものかを判別させることで、トークンが盗まれたときになりすましを防ぐ。セッションのnonceとトークンに付加されたnonceを比較してこのセッション用のトークンなのかを判断する
- セッションのnonceを変える？

**PKCE**
- PKCE:最初にクライアントがクライアントがランダムな検証用コードcode_verifierを生成し、ハッシュ化(SHA-256)させたcode_challengeを作る→認可サーバーに認可リクエストとcode_challengeを伝える→Googleはcode_challengeを保存し、クライアントに認可コード（引換券）を渡す→クライアントがcode_verifierと認可コード（引換券）を送る→認可サーバーはcode_verifierを再度ハッシュ化(SHA-256)してcode_challengeと一致するか比較する→一致すればアクセストークンと交換して返信する
- code_verifierを変える？

###### セッションハイジャック
- ↑の二つを改ざんするためにセッションハイジャックを試したが、これではピンポイントでNonceとcode_verifierを変えることが出来なかった
- セッションハイジャックの流れ
```
1. 登録済みTrueユーザーでログイン
2. 正規ユーザーのCookieを開発者ツールの`Application → Cookies`や
`Network → ?token=~~~のヘッダー`から取得する
3. 別のログインしていないブラウザにコピーしたCookieを設定
- 開発者ツールの`Application → Cookies`からsessionの値を書き換える
4. クイズに挑戦できる
→cookie内の情報にsubなどのデータが入っているので、既に認証済ユーザーとしてログインした状態と認識されて挑戦出来た
```
###### Nonceのチェック
- セッションハイジャックを調整していた中で、Cookieの署名鍵を変更した後、別アカウントでGoogleログインを押した際に、Googleログイン画面のURLで`client_id,nonce,response_type,state,flowName,continue,app_domain,rart`などのパラメータがあった
- この中の`nonce`を書き換えてログインする　ログイン成功→ここのnonceを変えても効果が無かった
- 仮説：urlはこれから送るnonceでそれを送信時にcookieに保存して帰ってきてから確認するから変えても意味が無かった　→　✕
- 理由：Googleのアカウント選択画面に遷移した時点で、Googleはすでに認可リクエストを受け付けており、選択画面のURLを変更しても反映されないから？今回変更したURLはGoogleが認可リクエストを受け付けた後、アカウント選択画面を表示するためのURLを絞るためのものでnonceの中身として送るパラメータではない。
- Googleの/signin/...にあるnonceを書き換えても、Request URL（auth?response_type=code...）のnonceは変わらなかった→auth?response_typeのRequest URLを先に送っていて、googleはこれをもとに判断していると思われる
- このRequest URLを書き換えて送る
- `nonce=`以下を`korehatesuto`に変えて送る↓で、nonceの前に弾かれている
```
400 Bad Request→state不一致エラー
404 Not Found→Chromeの開発者ツール（DevTools）が/.well-known/appspecific/com.chrome.devtools.json、FastAPIに対して設定ファイルを探すリクエストを送ったがファイルが無かったため
```
- URLを書き換える方法ではstate不一致エラーしか起きず断念　AIの用意した以下の方法を試す

- **nonce改ざんによるチェック**
- `/api/login`の`authorize_redirect()`で生成したリダイレクトURLの`nonce`だけを書き換えた。
- Authlibがセッションに保存した元の`nonce`は変更しない。

**変更したコード**
```python
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

@app.get("/api/login")
async def login(request: Request):
    url = request.url_for("auth")
    response = await oauth.google.authorize_redirect(request, url)

    parts = urlsplit(response.headers["location"])
    params = parse_qsl(parts.query, keep_blank_values=True)

    params = [
        (k, "korehatesuto" if k == "nonce" else v)
        for k, v in params
    ]

    response.headers["location"] = urlunsplit((
        parts.scheme,
        parts.netloc,
        parts.path,
        urlencode(params),
        parts.fragment
    ))

    return response
```

**検証結果**
- Googleログイン後、FastAPIで`500 Internal Server Error`が発生。
- ログに`InvalidClaimError("nonce")`が表示された。
- `authlib/oidc/core/claims.py`の`validate_nonce()`でnonceの不一致を検出したことを確認。
- 検証後`/api/login`を元のコードに戻した。

###### PKCEのチェック
- nonceのチェックの時にURLを確認したがcode_challengeやverifierなどそれらしいものが無かった
- AuthlibではPKCEを導入するためには`"code_challenge_method": "S256",`をclient_kwargsに登録しなければならない事が分かった
- - [Authlib公式ドキュメント](https://docs.authlib.org/en/stable/oauth2/client/web/index.html#oauth-2-0-code-challenge)のWebClients-OAuth 2.0 Code Challengeを参考にPKCEを導入した。
- `client_kwargs`に`"code_challenge_method": "S256",`を追加した
- ログイン時のURLに`code_challenge=`が追加されていることを確認した
- PKCE導入後のコードチェック
```
True 〇
False 〇
データなし 〇
Trueログイン後挑戦前False変更 〇
```

- **PKCE改ざんによるチェック**
- `/api/login`の`authorize_redirect()`で生成したリダイレクトURLの`code_challenge`だけを書き換えた。
- Authlibがセッションに保存した元の`code_verifier`は変更しない。

**変更したコード**
```python
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

@app.get("/api/login")
async def login(request: Request):
    url = request.url_for("auth")
    response = await oauth.google.authorize_redirect(request, url)

    parts = urlsplit(response.headers["location"])
    params = parse_qsl(parts.query, keep_blank_values=True)

    if not any(k == "code_challenge" for k, v in params):
        raise RuntimeError("PKCEが有効ではありません")

    params = [
        (k, "A" * 43 if k == "code_challenge" else v)
        for k, v in params
    ]

    response.headers["location"] = urlunsplit((
        parts.scheme,
        parts.netloc,
        parts.path,
        urlencode(params),
        parts.fragment
    ))

    return response
```

**検証結果**
- Googleログイン後、トークンリクエストで`invalid_grant`が発生。
- Googleがトークン交換を拒否したことを確認。
- `code_challenge`と`code_verifier`の不一致によって拒否された可能性が高く、PKCEの検証が機能していると考えられる。
- 検証後、`/api/login`を元のコードに戻した。

##### ログアウト機能追加
**バックエンド**
- ログアウトが無いとセッションが残り続けてしまう
- 参考動画では`pop`を使用していたが、このアプリでは`uid`で区別して、追加しているので`userやuid`だけでは他のデータが残る→clear()ですべて消す
- リダイレクト時のパラメーターでreactからメッセージを表示する
```
@app.get('/logout')
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="http://localhost:5173/?status=logouted")
```
- get('/ogout')/→post('/api/logout')に変更
- 理由：CRSF攻撃防止のために状態変遷を伴う操作にはGETではなくPOSTで行うべきだから
- 参考：[OWASP「Cross-Site Request Forgery Prevention Cheat Sheet」](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- CRSF＝ユーザーがログインしているWebサイトに対して、攻撃者がユーザーの意図しないリクエストを送信させる攻撃
**フロントエンド**
- codexにログアウト用フロントエンド、画面遷移Reactを追加させる＋画面のレイアウトを変更する
- 命令文
```
クイズアプリにログアウト機能を作りました。あなたは、このログアウト機能にpostを送るためのエンドポイントのボタンを作ってください。また、／画面のレイアウトを　２＊２で並べているところを上から　挑戦する１→前回結果１→問題追加１→ｇｏｏｇｌｅログインとログアウトで１列と縦並びにしてください　
完成条件
レイアウトが指示通りになっている
ログアウト後、クエリを受け取って以下のメッセージを表示する"ログアウトしました"
テストを行い他機能含めて利用可能であること
条件
バックエンドに変更を加えない
変更箇所の記録必須
最小限の変更　既存のコードの確認必要
変更箇所は説明必須
既存APIの使用は必ず確認する
変更箇所
以下のコードを追加
@app.post('/api/logout')
def logout(request: Request, login_check_result: int = Depends(login_checker)):
        request.session.clear()
        return RedirectResponse(url="http://localhost:5173/?status=logouted")
```
- テスト　レイアウト 〇、ログアウト 〇、ログアウト状態でログアウト 〇
### 学んだこと
### エラー・解決
### 次回やること
