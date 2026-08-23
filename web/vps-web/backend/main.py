from fastapi import FastAPI 
from models import Question, Answer
from ask import ask_question

app = FastAPI()

@app.get("/greet")
def greet():
    return"Welcome to English quiz!"


questions = [
    Question(id=1, word="implement", meaning="実行する、導入する"),
    Question(id=2, word="department", meaning="部門、売り場"),
    Question(id=3, word="review", meaning="検討する、論評する"),
    Question(id=4, word="detail", meaning="詳細"),
    Question(id=5, word="advertising", meaning="広告"),
]


@app.get("/quiz/uid")
def get_questions(): #DBから単語取得
    pass

@app.post("/quiz")
def check_and_counter(answers: list[Answer]):
    score = 0
    results = []
    for answer in answers:
        is_correct = ask_question(answer,questions)
        if is_correct == 1:
            results.append({
                "result": "〇"
            })
        else:
            id = answer.id
            for question in questions:
                if question.id == id:
                    correct_answer = question.meaning
                    results.append({
                "result": "✕",
                "answer": correct_answer
            })

    
            

        score = score + is_correct
        
    return{
        "results": results,
        "score": score
    }
    

