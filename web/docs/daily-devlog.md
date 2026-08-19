# 日ごとの開発記録

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
