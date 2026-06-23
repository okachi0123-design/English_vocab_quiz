cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1
source config.sh
correct=$(grep -c "1" "$COUNT_FILE")
percentage=$(( correct * 100 / $1 ))
echo "$1""問中""$correct""問正解"

echo "$percentage""%"

if [ "$percentage" -lt 10 ]
   then echo "くそ雑魚やんw"
   else if [ "$percentage" -lt 20 ]
           then echo "よっわw"
           else if [ "$percentage" -lt 40 ]
	           then echo "フフッw"
                   else if [ "$percentage" -lt 60 ]
			   then echo "しょうもな"
                           else if [ "$percentage" -lt 80 ]
			           then echo "や、やるやん"
	                           else if [ "$percentage" -lt 90 ]
				           then echo "こいつ、ただ者じゃない"
					   else if [ "$percentage" -le 100 ]
					           then echo "You are GOAT"
					        fi
				        fi
			        fi
		        fi
                fi
        fi
fi


