from models import Answer
from sqlalchemy.orm import Session
import sql_dbmodels

def ask_question(answer: Answer, db: Session):
    
    sol_id = answer.id

    solution = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.id == sol_id).first()

    if solution.meaning == answer.meaning:
        return 1
    else:
        return 0



    return 0