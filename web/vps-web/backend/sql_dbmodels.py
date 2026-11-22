from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class SQLQuestion(Base):

    __tablename__ = "eng_vocabulary_words"

    uid = Column(Integer, ForeignKey("webquiz_users.uid"), primary_key=True)
    id = Column(Integer, primary_key=True, autoincrement=True)
    word = Column(String)
    meaning = Column(String)


class SQLUsers(Base):

    __tablename__ = "webquiz_users"

    sub = Column(String,  nullable=False, unique=True)
    uid = Column(Integer, primary_key=True, index=True)
    is_allowed = Column(Boolean, default=False, nullable=False)
