from fastapi import Depends,FastAPI 
from models import Question, Answer
from ask import ask_question
from database_conf import engine, SessionLocal
import sql_dbmodels
import os
from  question import get_questions
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse
from result import result
from message import message
from dotenv import load_dotenv
import os
from fastapi import Header
from pass_auth import password_auth




load_dotenv()


app = FastAPI()

sql_dbmodels.Base.metadata.create_all(bind=engine)

  


questions = [
    Question(id=1, word="implement", meaning="実行する、導入する"),
    Question(id=2, word="department", meaning="部門、売り場"),
    Question(id=3, word="review", meaning="検討する、論評する"),
    Question(id=4, word="detail", meaning="詳細"),
]

def check_password(enterd_password: str = Header()):
    result_auth = password_auth(enterd_password)
    return result_auth

def get_db():
    db = SessionLocal()
    try: 
        yield db  
    finally: 
        db.close() 

def init_db():
    db = SessionLocal()

    count = db.query(sql_dbmodels.SQLQuestion).count()

    if count == 0:

        for question in questions:
           db.add(sql_dbmodels.SQLQuestion(**question.model_dump()))
        db.commit()
    db.close()

init_db()



@app.get("/quiz")
def prepare_questions(attempt_count: int, db: Session = Depends(get_db), result_auth: int = Depends(check_password)):
    if result_auth == 1:
        questions = get_questions(attempt_count, db)#DBから単語取得
    
        return questions
    else:
        return "パスワードが正しくありません"

@app.post("/quiz")
def check_and_counter(answers: list[Answer], db: Session = Depends(get_db), result_auth: int = Depends(check_password)):
    if result_auth == 1:
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

    
            

            score = score + is_correct
            attempt = attempt + 1

            percentage = result(score, attempt)
            percentage = round(percentage, 2)
        
            result_message = message(percentage)
        
        return{
            "results": results,
            "attempt": attempt,
            "score": score,
            "percentage": percentage,
            "message": result_message
        }

    else:
        return "パスワードが正しくありません"
    

