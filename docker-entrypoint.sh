#!/bin/bash

ln -sv /opt/attic/attic-server/node_modules /etc/attic
node /etc/attic/makeConfig.js

"$@"

