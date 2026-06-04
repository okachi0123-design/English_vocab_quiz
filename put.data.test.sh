#!/bin/bash
source config.sh
source .venv/bin/activate
mkdir -p "$DATA_DIR"

python wordqz.py > $DATA_DIR/word.csv
python phraseqz.py > $DATA_DIR/phrase.csv

