#!/bin/bash 

source config.sh

if [ ! -e /tmp/ENquiz/word.csv -o ! -e /tmp/ENquiz/phrase.csv ]
	then source "put.data.test.sh" && bash bash ask.sh $1
        
        else if [ /tmp/ENquiz/word.csv -nt "$EXCEL_PATH" -a /tmp/ENquiz/phrase.csv -nt "$EXCEL_PATH" ] 
	then bash ask.sh $1

	else source "put.data.test.sh" && bash ask.sh $1
	fi
        fi	
