#!/bin/bash 

bash "test.grp.ENquiz.sh" $1 |tee /tmp/ENquiz/answer.tmp


bash "percentage.sh" $1

