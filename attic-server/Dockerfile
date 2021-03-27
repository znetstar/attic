FROM node:12-slim

WORKDIR /opt/attic/attic-server

ADD . /opt/attic/attic-server

RUN npm install -g

EXPOSE 80

ENTRYPOINT [ "/usr/local/bin/attic-server" ]