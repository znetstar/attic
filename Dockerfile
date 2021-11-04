FROM public.ecr.aws/znetstar/attic-server:3.8.0

FROM node:12

COPY --from=0 /opt/attic /opt/attic

ARG NODE_OPTIONS="--max-old-space-size=2560"

ENV DEBIAN_FRONTEND noninteractive

WORKDIR /opt/attic/attic-server

RUN npm ci && \
    npm install --no-save @etomon/attic-server-google @znetstar/attic-server-rest @znetstar/attic-server-s3 dotenv

ENV PATH "$PATH:/opt/attic/attic-server/bin"

ENV PORT 80

ENV HOST '0.0.0.0'

ADD ./config /etc/attic
ADD ./docker-entrypoint.sh /docker-entrypoint.sh
ADD ./attic-marketplace-mods /opt/attic-marketplace-mods


RUN cd /opt/attic-marketplace-mods && \
    npm ci && \
    npm run build

ENV EMAIL_HOSTNAME social

ENV LOG_LEVEL "info"

EXPOSE 80

VOLUME /root/.jsipfs

ENTRYPOINT [ "/docker-entrypoint.sh" ]

CMD [ "attic-server",  "-f", "/etc/attic/config.json" ]
