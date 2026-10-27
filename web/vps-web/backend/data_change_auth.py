from dotenv import load_dotenv
import os

def dcpassword_auth(entered_dcpassword :str):
    dcpassword = os.getenv("API_PASSWORD")
    if dcpassword == entered_dcpassword:
        return 1
    else:
        return 0