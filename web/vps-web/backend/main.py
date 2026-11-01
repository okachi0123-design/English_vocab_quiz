from fastapi import Depends,FastAPI, HTTPException
from models import Question, Answer, NewQuestion
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
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.security import APIKeyHeader
from data_change_auth import dcpassword_auth
from starlette.requests import Request
from authlib.integrations.starlette_client import OAuth, OAuthError
from auth_conf import CLIENT_ID, CLIENT_SECRET, SECRET_COOKEY
from starlette.middleware.sessions import SessionMiddleware
from identify_user import identify_user

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "enterd-password", "data-change-key"],
)

app.add_middleware(SessionMiddleware,secret_key="SECRET_COOKEY")

header_scheme = APIKeyHeader(
    name="data-change-key",
    description="APIkey required to PUT,ADD or DELETE data",
    auto_error=True
    )
oauth = OAuth()
oauth.register(
    name = 'google',
    server_metadata_url='',
    client_id = CLIENT_ID,
    client_secret = CLIENT_SECRET,
    client_kwargs={
        'scope': 'email openid profile',
        'redirect_url': 'http://localhost:8000/auth',
    }
)

def authorize_data_change(key: str = Depends(header_scheme)):
    result_data_auth = dcpassword_auth(key)
    return result_data_auth



sql_dbmodels.Base.metadata.create_all(bind=engine)

  


questions = [
    NewQuestion(word="implement", meaning="実行する、導入する"),
    NewQuestion(word="department", meaning="部門、売り場"),
    NewQuestion(word="review", meaning="検討する、論評する"),
    NewQuestion(word="detail", meaning="詳細"),
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



@app.get("/api/quiz")
def prepare_questions(attempt_count: int, db: Session = Depends(get_db), result_auth: int = Depends(check_password)):
    if attempt_count >= 100: 
        return "問題数が多すぎます"
    elif attempt_count <= 0:
        return "１つ以上を選択してください"
    else:
        if result_auth == 1:
            questions = get_questions(attempt_count, db)#DBから単語取得
    
            return questions
        else:
            return "パスワードが正しくありません"
   
   

@app.post("/api/quiz")
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


@app.put("/api/data")
def replace_questions(new_data: Question ,db: Session = Depends(get_db), result_data_auth: int = Depends(authorize_data_change)):
    if result_data_auth == 1:
        old_data = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.id == new_data.id).first()
        if old_data:
            old_data.word = new_data.word
            old_data.meaning = new_data.meaning
            db.commit()
            return "テーブルがアップデートされました"

        else:
            return "データに異常があります"

    else:
        return "パスワードが正しくありません"


@app.post("/api/data")
def add_question(new_questions: list[NewQuestion], db: Session = Depends(get_db), result_data_auth: int = Depends(authorize_data_change)):
    if result_data_auth == 1:
        error_message = []
        success_message = []
        for new_question in new_questions:

            same_word = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.word == new_question.word).first()

            if same_word:
                error_message.append({
                    "word": same_word.word,
                    "message": "同一単語が存在します"
                })


            else:
                db.add(sql_dbmodels.SQLQuestion(**new_question.model_dump()))
                db.commit()

                success_message.append({
                    "word": new_question.word,
                    "message": "単語が追加されました"
                })
        return success_message, error_message

    else:
        return "パスワードが正しくありません"


@app.delete("/api/data")
def delete_question(delete_ids: list[int], db: Session = Depends(get_db), result_data_auth: int = Depends(authorize_data_change)):
    if result_data_auth == 1:
        delete_items = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.id.in_(delete_ids)).all()
        deleted_words = []
        for delete_item in delete_items:
            db.delete(delete_item)
            db.commit()
            deleted_words.append(delete_item.word)
        if deleted_words:
            return "以下の問題が削除されました",deleted_words
        else:
            return "データが削除されませんでした"

    else:
        return "パスワードが正しくありません"
    

@app.get("/login") #ログイン時に認可コード送り先を取得すると同時に、認可サーバーにリダイレクトする関数
async def login(request: Request): #/loginアクセス時の非同期処理
    url = request.url_for('auth') # 認可コードの受け取り先（redirect_url）を取得 
    return await oauth.google.authorize_redirect(request, url)# Googleの認可サーバーへリダイレクト

@app.get('/auth') #認可コード受け取り場所 /auth
async def auth(request: Request, db: Session = Depends(get_db)): #認可コードを受け取り、送信してトークンを取得する関数
    try:
        token = await oauth.google.authorize_access_token(request) #非同期で認可コードを送りアクセストークンのリクエストを送る
    except OAuthError as e: #エラー時の処理　as e:エラー内容を変数eに保存
    
        raise HTTPException(
              status_code=400,
              detail="認証に失敗しました"
        ) #HTTPステータス（400エラー）とエラーメッセージ
    user = token.get('userinfo') #トークンの取得結果からuserinfoを取り出し、変数userに保存
    if user: #userあれば
        sub = user.get('sub')
        if sub:
            user_data = identify_user(sub, db)
            if user_data:
                if user_data.is_allowed == True:
                    request.session['uid'] = user_data.uid #user情報からuidを見つけて、セッションに保存
                    return "認証に成功しました"
                else:
                    raise HTTPException(
                        status_code=403,
                        detail="認証が許可されていません"
                        )
            else:
                db.add(sql_dbmodels.SQLUsers(sub=sub, is_allowed=False))
                db.commit()
                raise HTTPException(
                        status_code=403,
                        detail="ユーザー情報を送信しました。管理者の許可をお待ちください。"
                        )
        else:
            raise HTTPException(
                status_code=401,
                detail="正確なユーザー情報の取得に失敗しました"
                )
    raise HTTPException(
                status_code=401,
                detail="Googleからユーザー情報を取得できませんでした"
    ) #HTTPステータス（401エラー）とエラーメッセージ