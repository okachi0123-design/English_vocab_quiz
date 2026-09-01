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



load_dotenv()


app = FastAPI()

sql_dbmodels.Base.metadata.create_all(bind=engine)


#("/")は静的webでフロントエンドで挑戦するを押すとURLを("/pass")に切り替え

@app.get("/pass") #挑戦するを押したあと
def show_password_page():
    pass

@app.post("/pass") #パスワード認証
def password_auth(entered_password :str):
    password = os.getenv("PASSWORD")
    if password == entered_password:
        return RedirectResponse(
        url="/quiz",
        status_code=303
        )
    else:
        return "Password is not correct"
    



questions = [
    Question(id=1, word="implement", meaning="実行する、導入する"),
    Question(id=2, word="department", meaning="部門、売り場"),
    Question(id=3, word="review", meaning="検討する、論評する"),
    Question(id=4, word="detail", meaning="詳細"),
]

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
def prepare_questions(attempt_count: int, db: Session = Depends(get_db)):
    
    questions = get_questions(attempt_count, db)#DBから単語取得
    
    return questions

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
    

