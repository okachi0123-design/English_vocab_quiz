from pydantic import BaseModel

class Question(BaseModel):
    id: int
    word: str
    meaning: str

class Answer(BaseModel):
    id: int
    meaning: str

class NewQuestion(BaseModel):
    word: str
    meaning: str
