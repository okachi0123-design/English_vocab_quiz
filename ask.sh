#!/bin/bash

shuf -n $1 /tmp/ENquiz/word.csv > /tmp/ENquiz/shuf.txt

while IFS=',' read -r word meaning

     do echo "$word"
     read -p "意味： " answer < /dev/tty
     if [ "$answer" = "$meaning" ]
        then echo "正解"
	else echo "不正解"	
             echo "$meaning"
     fi
     done < /tmp/ENquiz/shuf.txt


