FROM node:12

ADD ./attic-common /app/attic-common
WORKDIR /app/attic-common
RUN npm ci && \
    npm link

ADD ./attic-cli-common /app/attic-cli-common
WORKDIR /app/attic-cli-common
RUN npm ci && \
    npm link @znetstar/attic-common && \
    npm link

ADD ./attic-cli-url-shortener /app/attic-cli-url-shortener
WORKDIR /app/attic-cli-url-shortener
RUN npm ci && \
    npm link @znetstar/attic-common && \
    npm link @znetstar/attic-cli-common && \
    npm link

ADD ./attic-cli /app/attic-cli
WORKDIR /app/attic-cli
RUN npm ci -g && \
    npm link @znetstar/attic-common && \
    npm link @znetstar/attic-cli-common && \
    npm link @znetstar/attic-cli-url-shortener

ADD ./attic-server /app/attic-server
RUN npm ci -g && \
    npm link @znetstar/attic-common

EXPOSE 7373

EXPOSE 3737

