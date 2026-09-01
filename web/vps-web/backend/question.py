#問題取得 クエリでランダム取得

from  sqlalchemy import func
from sqlalchemy.orm import Session
import sql_dbmodels

def get_questions(attempt_count: int, db: Session):
    question_rows = db.query(sql_dbmodels.SQLQuestion.id, sql_dbmodels.SQLQuestion.word).order_by(func.random()).limit(attempt_count).all()
    questions =[
    {"id": row.id, "word": row.word}
    for row in question_rows
]
    return questions
# SELECT * FROM テーブル名　ORDER BY RAMDOM() LIMIT 指定数;