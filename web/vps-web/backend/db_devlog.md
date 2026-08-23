# データベース構築ログ
## 作業内容
### 使用環境、ツールのインストール
- pip install sqlalchemy psycopg2-binary

### データベースモデル設計
- Columnの設定
```
id : 主キー,インデックス,Integer
word : String
meaning : String
```
- テーブル名 : eng_vocabulary_words
- クラス名 : SQLQuestion
- ベース : Base = declarative_base()＃使用するクラスに継承することでSQLAlchemyのDBであると明示
```
from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class SQLQuestion(Base):

    __tablename__ = "eng_vocabulary_words"

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String)
    meaning = Column(String)
```

### DB設定ファイルの設計
#### Session
- DBへの接続を確立するための設計
- SQLAlchemyの`sessionmaker`を利用
- sessionmaker関数の設定
`autocommit=False:データベース変更を確定する時にcommit()を必要に`
`autoflush=False:変更をデータベースに送る前にflush()[commitだけでもOK]やcommit()を必要に`
`bind=engine:接続用エンジン指定`
#### Engine
- DBに接続させるエンジン
- SQLAlchemyの`create_engine`を使用
- 引数のurlをdb_url変数に挿入
#### .env
- 環境用の隠しファイル(データベースのurl,passwordなど)
- `.gitignore`に`.env`を登録
- python-dotenvをインストール
- .envファイル内で変数にURLを挿入
  `DATABASE_URL = データベース接続用URL`
- URLを使うDB設定ファイル内に`dotenv`ライブラリから(load_dotenv)をインポートし`.env`から環境変数をロードできるにする
- osモジュールをインポートし、環境変数を変更可能にする
- `load_dotenv()`でロードする
- create_engineで指定する変数urlにURLを挿入
```
from dotenv import load_dotenv
import os

load_dotenv()

db_url = os.getenv("DATABASE_URL")

```

####

