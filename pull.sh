#!/bin/bash

git reset --hard HEAD

echo "Pulling on branch $BRANCH"

if [ -d "./attic" ]
then
    git subtree pull --prefix attic git@github.com:ThirdAct-Open-Source/attic master --squash
else
    git subtree add --prefix attic git@github.com:ThirdAct-Open-Source/attic master --squash
fi
