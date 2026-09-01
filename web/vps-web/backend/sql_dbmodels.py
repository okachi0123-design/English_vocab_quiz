from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class SQLQuestion(Base):

    __tablename__ = "eng_vocabulary_words"

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String)
    meaning = Column(String)

