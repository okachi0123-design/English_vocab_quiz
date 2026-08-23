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

### 
