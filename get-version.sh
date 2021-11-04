#!/bin/bash

docker run -i --entrypoint=/usr/local/bin/node -v "$(pwd)"/Dockerfile:/Dockerfile  --rm node:14-slim -e 'process.stdout.write(require("fs").readFileSync("/Dockerfile", "utf8").split("\n")[0].split(":").slice(-1)[0])'
