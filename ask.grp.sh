#!/bin/bash

shuf -n $1 /tmp/ENquiz/word.csv > /tmp/ENquiz/shuf.txt

while IFS=',' read -r word meaning
     do while true
        do echo "$word"
           read -p "意味： " answer < /dev/tty
     
           if [ -z "$answer" ]
                      then echo "skip"
                   echo "$meaning"
           break
              else if [ "$answer" = "$meaning" ]
                      then echo "正解"
                           echo "$meaning"
               break
                      else if [ ${#answer} -lt 2 ]
                                      then echo "二文字以上で入力してください"                         
                                   continue
                              else hits=$(echo "$meaning"|grep "$answer")
                       if [ -n "$hits" ]
                                      then echo "正解"
                                           echo "$meaning"
                       break
                                      else echo "不正解"
                                           echo "$meaning"
                       break
                            fi         
                           fi
                   fi
           fi
        done 
     done < /tmp/ENquiz/shuf.txt 
