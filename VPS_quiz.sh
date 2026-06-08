#!/bin/bash
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1
source config.sh

trap '[ -n "$TMP_DIR" ] && rm -rf "$TMP_DIR"' EXIT

while true
do
read -p "何問挑戦する？" HOWMANY

if [ "$HOWMANY" -gt 0 -a "$HOWMANY" -lt 999 ] 2>/dev/null

   then bash ask.ct.sh "$HOWMANY"
        bash percentage.sh "$HOWMANY"
        break
   else echo "有効な入力をしてください！"
fi 
done

