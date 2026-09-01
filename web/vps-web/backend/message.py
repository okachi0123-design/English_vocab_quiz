def message(percentage: float):
    if percentage == 100:
        return "天才"
    elif percentage == 50:
        return "一番おもんない"
    elif percentage >= 90:
        return "や、やるやん"
    elif percentage >= 75:
        return "そこそこ頑張ったな"
    elif percentage >= 60:
        return "まあまあやな"
    elif percentage >= 40:
        return "しょうもない点数"
    elif percentage >= 30:
        return "弱い"
    elif percentage >= 20:
        return "雑魚"
    elif percentage >= 10:
        return "フッw 何個かは当たってるやん"
    elif percentage >= 0:
        return "..."