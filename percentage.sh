correct=$(grep -c "○"</tmp/ENquiz/answer.tmp)
percentage=$(echo "scale=1; $correct * 100 / $1" | bc)
echo "$1""問中""$correct""問正解"

echo "$percentage""%"
