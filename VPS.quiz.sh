#!/bin/bash
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1
while true
do
read -p "IDを入力してね" ID

if [ "$ID" -ge 1 -a "$ID" -le 999 ] 2>/dev/null
   then if [ ! -f "$HOME"/"$ID"_score ] 2>/dev/null

           then echo "アカウントが見つかりません" 
           continue
           else source VPS.config.sh "$ID"
           
                trap '[ -n "$TMP_DIR" ] && rm -rf "$TMP_DIR"' EXIT

                while true
                do
                read -p "何問挑戦する？" HOWMANY

                if [ "$HOWMANY" -gt 0 -a "$HOWMANY" -lt 999 ] 2>/dev/null

                   then bash VPS.ask.ct.sh "$HOWMANY" "$ID"
                        bash VPS.percentage.sh "$HOWMANY" "$ID"
                        head -1 "$HOME"/"$ID"_score
                        tail -5 "$HOME"/"$ID"_score 
                        break
                   else echo "有効な入力をしてください！"
                fi 
                done
                break
        fi
   else echo "不正な入力です"
        continue
fi
done

