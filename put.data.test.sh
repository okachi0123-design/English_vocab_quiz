#!/bin/bash
source .venv/bin/activate

mkdir -p /tmp/ENquiz

python wordqz.py > /tmp/ENquiz/word.csv

python phraseqz.py > /tmp/ENquiz/phrase.csv

