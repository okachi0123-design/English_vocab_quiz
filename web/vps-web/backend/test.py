from models import Question,Answer
from ask import ask_question

questions = [
    Question(id=1, word="implement", meaning="実行する、導入する"),
    Question(id=2, word="department", meaning="部門、売り場"),
    Question(id=3, word="review", meaning="検討する、論評する"),
    Question(id=4, word="detail", meaning="詳細"),
    Question(id=5, word="advertising", meaning="広告"),
]

answers = [
    Answer(id=1, meaning="実行する、導入する"),
    Answer(id=2, meaning="部門、売り場"),
    Answer(id=3, meaning="検討する、論評する"),
    Answer(id=4, meaning="詳細"),
    Answer(id=5, meaning="広告"),
]

def check_and_counter(answers):
    score = 0
    for answer in answers:
        is_correct = ask_question(answer.id,answer.meaning,questions)
        score = score + is_correct
    
    print(score) 





