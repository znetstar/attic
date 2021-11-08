#!/bin/bash

cat attic/attic-server/package.json | docker run -i --entrypoint=/usr/local/bin/npx --rm node:14-slim json version
