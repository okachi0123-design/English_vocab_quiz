from dotenv import load_dotenv
import os

def password_auth(entered_password :str):
    password = os.getenv("PASSWORD")
    if password == entered_password:
        return 1
    else: 
        return 0