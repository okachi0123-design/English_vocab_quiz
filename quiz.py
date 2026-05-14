import openpyxl
wb = openpyxl.load_workbook("/mnt/c/Users/okach/OneDrive/English/TOEIC_730_30day_checklist (1).xlsx")

ws1 = wb["単語ログ"]
ws2 = wb["フレーズログ"]
for row in ws1.iter_rows(min_row=3,values_only=True):
    word = row[2]
    meaning = row[4]
    if word is None:

        continue 

    print(f"{word}: {meaning}")
