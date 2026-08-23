from models import Answer

def ask_question(answer: Answer,questions):
    for question in questions:
            if question.id == answer.id:
                if question.meaning == answer.meaning:
                    return 1
                else:
                    return 0



    return 0