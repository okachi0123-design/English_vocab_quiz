#!/bin/bash
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1
source config.sh
bash ask.ct.sh $1
bash percentage.sh $1
