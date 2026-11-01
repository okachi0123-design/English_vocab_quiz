from sqlalchemy.orm import Session
import sql_dbmodels

def identify_user(sub: str,db: Session):
    user_data = db.query(sql_dbmodels.SQLUsers).filter(sql_dbmodels.SQLUsers.sub == sub).first()
    return user_data