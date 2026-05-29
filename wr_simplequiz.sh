#!/bin/bash

shuf -n $1 csv.d/word.csv > shuf.txt

while IFS=',' read -r word meaning

      do echo "$word"
         echo "$meaning"
      done < shuf.txt
	
