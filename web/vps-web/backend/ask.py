from models import Answer

def ask_question(answer: Answer,solutions):
    for solution in solutions:
            if solution.id == answer.id:
                if solution.meaning == answer.meaning:
                    return 1
                else:
                    return 0



    return 0