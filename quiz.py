import openpyxl
from config import EXCEL_PATH
wb = openpyxl.load_workbook(EXCEL_PATH)

ws1 = wb["単語ログ"]
ws2 = wb["フレーズログ"]
for row in ws1.iter_rows(min_row=3,values_only=True):
    word = row[2]
    meaning = row[4]
    if word is None:

        continue 

    print(f"{word}: {meaning}")
