#!/bin/bash

source config.sh

if [ ! -e $DATA_DIR/word.csv -o ! -e $DATA_DIR/phrase.csv ]
        then source "put.data.test.sh" && bash ask.ct.sh $1

        else if [ $DATA_DIR/word.csv -nt "$EXCEL_PATH" -a $DATA_DIR/phrase.csv -nt "$EXCEL_PATH" ]
        then bash ask.ct.sh $1

        else source "put.data.test.sh" && bash ask.ct.sh $1
        fi
        fi
