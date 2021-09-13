FROM znetstar/attic-server

FROM node:14

COPY --from=0 /opt/attic /opt/attic

ARG NODE_OPTIONS="--max-old-space-size=2560"

ENV DEBIAN_FRONTEND noninteractive

WORKDIR /opt/attic/attic-server

RUN npm ci && \
    npm install --no-save @etomon/attic-server-google @znetstar/attic-server-rest dotenv

ENV PATH "$PATH:/opt/attic/attic-server/bin"

ENV PORT 80

ENV HOST '0.0.0.0'

ADD ./config /etc/attic
ADD ./docker-entrypoint.sh /docker-entrypoint.sh

ENV EMAIL_HOSTNAME social

EXPOSE 80

ENTRYPOINT [ "/docker-entrypoint.sh" ]

CMD [ "attic-server",  "-f", "/etc/attic/config.json" ]
