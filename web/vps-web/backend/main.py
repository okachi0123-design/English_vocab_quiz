from fastapi import Depends,FastAPI, HTTPException
from models import Question, Answer, NewQuestion, Users
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
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from authlib.integrations.starlette_client import OAuth, OAuthError
from auth_conf import CLIENT_ID, CLIENT_SECRET, SECRET_COOKEY
from starlette.middleware.sessions import SessionMiddleware
from identify_user import identify_user
from logging import getLogger, StreamHandler, Formatter, INFO, WARNING
from joserfc.errors import JoseError
from urllib.parse import urlsplit

logger=getLogger(__name__) #ログ出力命令
handler=StreamHandler() #ログ出力方法
logger.setLevel(INFO) #扱うログレベルの指定
formatter=Formatter('(%(levelname)s)%(asctime)s-%(message)s')
logger.addHandler(handler)
handler.setFormatter(formatter)
load_dotenv()
FRONTEND_URL = os.environ["FRONTEND_URL"]
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "enterd-password", "data-change-key"],
)

if not isinstance(SECRET_COOKEY, str) or not SECRET_COOKEY.strip():
    raise RuntimeError("セッション署名鍵が設定されていません")
else:
    app.add_middleware(
        SessionMiddleware,
        secret_key=SECRET_COOKEY,
        https_only=True, #HTTPS,SSLのときだけcookieがサーバーに送信されるかどうかのブール値
        same_site="lax", #クロスサイトリクエストを防ぐ
        max_age=3600 #有効期限（秒）
        )


oauth = OAuth()
oauth.register(
    name = 'google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_id = CLIENT_ID,
    client_secret = CLIENT_SECRET,
    client_kwargs={
        'scope': 'email openid profile',
        'prompt': 'select_account',
        "code_challenge_method": "S256",
    }
)


def origin_checker(request: Request):
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    if origin:
        if origin == FRONTEND_URL:
            return

    elif referer:
        parsed = urlsplit(referer)
        referer_origin = f"{parsed.scheme}://{parsed.netloc}"

        if referer_origin == FRONTEND_URL:
            return

    raise HTTPException(
        status_code=403,
        detail="不正な経路からのアクセスです"
    )

sql_dbmodels.Base.metadata.create_all(bind=engine)




questions = [
    NewQuestion(word="implement", meaning="実行する、導入する"),
    NewQuestion(word="department", meaning="部門、売り場"),
    NewQuestion(word="review", meaning="検討する、論評する"),
    NewQuestion(word="detail", meaning="詳細"),
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

def login_checker(request: Request, db: Session = Depends(get_db)):
    uid = request.session.get('uid')
    if uid:
        permission = db.query(sql_dbmodels.SQLUsers.is_allowed).filter(sql_dbmodels.SQLUsers.uid == uid).scalar()
        if permission == True:
            return
        elif permission == False:
            raise HTTPException(
                        status_code=403,
                        detail="認証が許可されていません"
                        )
        else:
            raise HTTPException(
                status_code=401,
                detail="ユーザー情報が登録されていません"
                )
    else:
        raise HTTPException(
                status_code=401,
                detail="ログインしてください"
                )


def word_exist_checker(request: Request, db: Session = Depends(get_db)):
    uid = request.session.get('uid')
    user_words = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.uid == uid).first()
    if user_words:
        return
    else:
        raise HTTPException(
                status_code=404,
                detail="単語が存在しません"
                )


@app.get("/api/quiz")
def prepare_questions(attempt_count: int, request: Request, db: Session = Depends(get_db), login_check_result = Depends(login_checker), word_exist_checker_result = Depends(word_exist_checker)):
    uid = request.session.get('uid')
    if attempt_count >= 100:
        return "問題数が多すぎます"
    elif attempt_count <= 0:
        return "１つ以上を選択してください"
    else:
        questions = get_questions(uid, attempt_count, db)#DBから単語取得
        return questions

@app.post("/api/quiz")
def check_and_counter(request: Request, answers: list[Answer], db: Session = Depends(get_db), login_check_result = Depends(login_checker), word_exist_checker_result = Depends(word_exist_checker)):
    score = 0
    attempt = 0
    results = []
    uid = request.session.get('uid')

    answer_ids = []
    for answer in answers:
        answer_id = answer.id
        answer_ids.append(answer_id)

    solutions = db.query(sql_dbmodels.SQLQuestion.id, sql_dbmodels.SQLQuestion.meaning).filter(sql_dbmodels.SQLQuestion.uid == uid, sql_dbmodels.SQLQuestion.id.in_(answer_ids)).all()


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


@app.get("/api/data")
def get_all_questions(request: Request, db: Session = Depends(get_db), login_check_result = Depends(login_checker)):
    uid = request.session.get('uid')
    questions = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.uid == uid).all()
    if not questions:
        return "まだデータが登録されていません"
    else:
        return questions

@app.put("/api/data")
def replace_questions(request: Request, new_data: Question ,db: Session = Depends(get_db), login_check_result = Depends(login_checker), word_exist_checker_result = Depends(word_exist_checker), origin_check_result = Depends(origin_checker)):
    uid = request.session.get('uid')
    old_data = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.uid == uid, sql_dbmodels.SQLQuestion.id == new_data.id).first()
    if old_data:
        old_data.word = new_data.word
        old_data.meaning = new_data.meaning
        db.commit()
        return "テーブルがアップデートされました", old_data.id, old_data.word

    else:
        return "データに異常があります"



@app.post("/api/data")
def add_question(request: Request, new_questions: list[NewQuestion], db: Session = Depends(get_db), login_check_result = Depends(login_checker), word_exist_checker_result = Depends(word_exist_checker), origin_check_result = Depends(origin_checker)):
    error_message = []
    success_message = []
    uid = request.session.get('uid')
    latest_id_row = db.query(sql_dbmodels.SQLQuestion.id).filter(sql_dbmodels.SQLQuestion.uid == uid).order_by(sql_dbmodels.SQLQuestion.id.desc()).first()
    if latest_id_row is None:
        new_data_id = 1
    else:
        new_data_id = latest_id_row.id + 1
    for new_question in new_questions:
        same_word = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.uid == uid, sql_dbmodels.SQLQuestion.word == new_question.word).first()

        if same_word:
            error_message.append({
                "word": same_word.word,
                "message": "同一単語が存在します"
            })

        else:
            db.add(sql_dbmodels.SQLQuestion(**new_question.model_dump(), uid=uid, id=new_data_id))
            db.commit()
            success_message.append({
                "id": new_data_id,
                "word": new_question.word,
                "message": "単語が追加されました"
            })
            new_data_id = new_data_id + 1

    return success_message, error_message


@app.delete("/api/data")
def delete_question(request: Request, delete_ids: list[int], db: Session = Depends(get_db), login_check_result = Depends(login_checker), origin_check_result = Depends(origin_checker)):
    uid = request.session.get('uid')
    delete_items = db.query(sql_dbmodels.SQLQuestion).filter(sql_dbmodels.SQLQuestion.uid == uid, sql_dbmodels.SQLQuestion.id.in_(delete_ids)).all()
    deleted_words = []
    for delete_item in delete_items:
        db.delete(delete_item)
        db.commit()
        deleted_words.append(delete_item.word)
    if deleted_words:
        return "以下の問題が削除されました",deleted_words
    else:
        return "データが削除されませんでした"




@app.get("/api/login") #ログイン時に認可コード送り先を取得すると同時に、認可サーバーにリダイレクトする関数
async def login(request: Request): #/loginアクセス時の非同期処理
    url = request.url_for('auth') # 認可コードの受け取り先（redirect_url）を取得
    return await oauth.google.authorize_redirect(request, url)# Googleの認可サーバーへリダイレクト

@app.get('/api/auth') #認可コード受け取り場所 /auth
async def auth(request: Request, db: Session = Depends(get_db)): #認可コードを受け取り、送信してトークンを取得する関数
    try:
        token = await oauth.google.authorize_access_token(request) #非同期で認可コードを送りアクセストークンのリクエストを送る
    except OAuthError as e: #エラー時の処理　as e:エラー内容を変数eに保存
        logger.error("トークンリクエスト送信エラー: %s", e.error)
        raise HTTPException(
              status_code=400,
              detail="認証に失敗しました"
        ) #HTTPステータス（400エラー）とエラーメッセージ

    except JoseError as e: #JoseErrorを追加
        logger.warning("IDトークン検証エラー: %s", e.error)
        raise HTTPException(
            status_code=401,
            detail="IDトークンの検証に失敗しました"
        ) #401エラーとメッセージ

    request.session.pop("uid", None)
    user = token.get('userinfo') #トークンの取得結果からuserinfoを取り出し、変数userに保存
    
    
    if user: #userあれば
        aud = user.get("aud")
        if aud != CLIENT_ID:
            logger.warning("クライアント不一致エラー aud=%s", aud)
            raise HTTPException(
            status_code=401,
            detail="別クライアントへのIDトークンです"
        )
        else:
            sub = user.get('sub')
            if sub:
                user_data = identify_user(sub, db)
                if user_data:
                    if user_data.is_allowed == True:
                        request.session['uid'] = user_data.uid #user情報からuidを見つけて、セッションに保存
                        logger.info("認証成功 uid=%s", user_data.uid)
                        return RedirectResponse(url=f"{FRONTEND_URL}/?auth_result=allowed")
                    else:
                        logger.info("認証済未許可 uid=%s", user_data.uid)
                        return RedirectResponse(url=f"{FRONTEND_URL}/?auth_result=denied")
                else:
                    db.add(sql_dbmodels.SQLUsers(sub=sub, is_allowed=False))
                    db.commit()
                    added_data = identify_user(sub, db)
                    logger.info("新規登録 uid=%s", added_data.uid)
                    return RedirectResponse(url=f"{FRONTEND_URL}/?auth_result=requested")
            else:
                logger.warning("sub取得失敗")
                return RedirectResponse(url=f"{FRONTEND_URL}/?auth_result=data_failed")
    logger.warning("Googleユーザー取得失敗")
    return RedirectResponse(url=f"{FRONTEND_URL}/?auth_result=google_request_failed")
        #HTTPステータス（401エラー）とエラーメッセージ

@app.post('/api/logout')
def logout(request: Request, origin_check_result = Depends(origin_checker)):
        request.session.clear()
        return RedirectResponse(url=f"{FRONTEND_URL}/?status=logouted")
