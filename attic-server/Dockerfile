FROM node:12-slim

WORKDIR /opt/attic/attic-server

ADD . /opt/attic/attic-server

RUN npm ci && \
    npm run build && \
    ln -s /opt/attic/attic-server/bin/attic-server /usr/local/bin/attic-server

ENV PATH "/usr/local/bin:/opt/attic/attic-server/bin:$PATH"

EXPOSE 7373

ENTRYPOINT [ "/usr/local/bin/attic-server" ]