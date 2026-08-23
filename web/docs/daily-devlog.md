# 日ごとの開発記録
## 日時
### 作業内容
#### 環境構築
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
#### 環境構築
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
