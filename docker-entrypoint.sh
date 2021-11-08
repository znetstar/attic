#!/bin/bash

rm -rf /etc/attic/*
cp -r /tmp/attic-config-skel/* /etc/attic
ln -sv /opt/attic/attic-server/node_modules /etc/attic
node /etc/attic/makeConfig.js

"$@"

