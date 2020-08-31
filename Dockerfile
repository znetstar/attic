FROM node:12

ADD ./attic-common /app/attic-common
WORKDIR /app/attic-common
RUN npm ci && \
    npm run build && \
    npm link && \
    npm prune --production

ADD ./attic-cli-common /app/attic-cli-common
WORKDIR /app/attic-cli-common
RUN npm ci && \
    npm run build && \
    npm link @znetstar/attic-common && \
    npm link && \
    npm prune --production

ADD ./attic-cli-url-shortener /app/attic-cli-url-shortener
WORKDIR /app/attic-cli-url-shortener
RUN npm ci && \
    npm pack && \
    rm -rf ./znetstar-attic-cli-url-*.tgz && \
    npm link @znetstar/attic-common && \
    npm link @znetstar/attic-cli-common && \
    npm link && \
    npm prune --production

ADD ./attic-cli /app/attic-cli
WORKDIR /app/attic-cli
RUN npm ci && \
    npm pack && \
    rm -rf ./znetstar-attic-cli-*.tgz && \
    npm link @znetstar/attic-common && \
    npm link @znetstar/attic-cli-common && \
    npm link @znetstar/attic-cli-url-shortener && \
    ln -sv /app/attic-cli/bin/run /usr/local/bin/attic-cli && \
    npm prune --production

ADD ./attic-server /app/attic-server
WORKDIR /app/attic-server
RUN npm ci && \
    npm run build && \
    npm link @znetstar/attic-common && \
    ln -s /app/attic-server/bin/attic-server /usr/local/bin/attic-server && \
    npm prune --production

WORKDIR /app

ENV NODE_ENV production

ENV PATH /usr/local/bin:$PATH

ENV WEB_RESOLVER_HOST 0.0.0.0

ENV HOST 0.0.0.0

EXPOSE 7373

EXPOSE 3737

