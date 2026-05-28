import openpyxl
from config import EXCEL_PATH

wb = openpyxl.load_workbook(EXCEL_PATH)
ws2 = wb["フレーズログ"]
for row in ws2.iter_rows(min_row=3,values_only=True):
    phrase = row[2]
    pmeaning = row[4]
    if phrase is None:

        continue

    print(f"{phrase},{pmeaning}")

