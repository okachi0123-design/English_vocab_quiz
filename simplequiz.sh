#!/bin/bash

shuf -n $1 csv.d/word.csv > shuf.txt

cut -d"," -f 1 <shuf.txt > shufw.txt
cut -d"," -f 2 <shuf.txt > shufm.txt

for i in `seq 1 $1` 
do
	head -$i shufw.txt|tail -1
        
	head -$i shufm.txt|tail -1

done

