#!/bin/bash
source config.sh
mkdir -p "$TMP_DIR"
> "$COUNT_FILE"
shuf -n $1 $DATA_DIR/word.csv > $SHUF_FILE

while IFS=',' read -r word meaning
     do while true
        do echo "$word"
           read -p "意味： " answer < /dev/tty
     
           if [ -z "$answer" ]
                      then echo "skip"
                           echo "$meaning"
			   echo "0" >> $COUNT_FILE
           break
              else if [ "$answer" = "$meaning" ]
                      then echo "○"
                           echo "$meaning"
			   echo "1" >> $COUNT_FILE
               break
                      else if [ ${#answer} -lt 2 ]
                                      then echo "二文字以上で入力してください"                         
                                   continue
                              else hits=$(echo "$meaning"|grep "$answer")
                       if [ -n "$hits" ]
                                      then echo "○"
                                           echo "$meaning"
					   echo "1" >> $COUNT_FILE
                       break
                                      else echo "✕"
                                           echo "$meaning"
					   echo "0" >> $COUNT_FILE
                       break
                            fi         
                           fi
                   fi
           fi
        done 
     done < $SHUF_FILE 
