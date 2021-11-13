#!/bin/bash

git reset --hard HEAD

echo "Pulling on branch $BRANCH"

if [ -d "./attic" ]
then
    git subtree push --prefix attic git@github.com:ThirdAct-Open-Source/attic master
fi
