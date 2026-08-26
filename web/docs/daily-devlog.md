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
#### DBからランダムデータの抽出
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
  
#### 設計の練り直し

### 設計・判断
- クイズアプリのURLの流れ　ルートでトップ画面と挑戦するかを聞く→挑戦するを押すと`post("/attempt")`を開いて挑戦数を受け取る→DBから問題を受け取る→クイズ→採点→結果通知
- "/attempt"はフロントエンドで挑戦を選択するとurlが開かれるようにする
- `get("/quiz")`でクイズを表示し、そのままフロントエンドに残す→`post("/quiz")`で解答とidを送信→idからDBを検索し、そのリストと解答を比較という形にする
### 学んだこと
- 各HTTPmethodはそれぞれの変数を引き継がないので分けて考えなければならない。
### エラー・解決
### 次回やること
- CRUDとDB接続　
