FROM node:12-slim

WORKDIR /opt/attic/attic-server

ADD ./package.json /opt/attic/attic-server/package.json
ADD ./package-lock.json /opt/attic/attic-server/package-lock.json

RUN npm ci

ADD . /opt/attic/attic-server

RUN npm run build && \
    ln -s /opt/attic/attic-server/bin/attic-server /usr/local/bin/attic-server

ENV PATH "/usr/local/bin:/opt/attic/attic-server/bin:$PATH"

EXPOSE 7373

ENTRYPOINT [ "/usr/local/bin/attic-server" ]