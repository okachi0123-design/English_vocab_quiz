from dotenv import load_dotenv
import os

load_dotenv()

CLIENT_ID = os.getenv("AUTH_CLIENT_ID")
CLIENT_SECRET = os.getenv("AUTH_CLIENT_SECRET")
SECRET_COOKEY = os.getenv("SECRET_SESSION_KEY")