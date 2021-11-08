FROM public.ecr.aws/znetstar/attic-server:latest

FROM public.ecr.aws/znetstar/libvips-base:latest

FROM ubuntu:20.04

RUN apt-get update -y && \
    apt-get install  -y curl sudo && \
    bash -c 'curl -fsSL https://deb.nodesource.com/setup_14.x | bash' && \
    apt-get update -y && \
    apt-get install -o Dpkg::Options::="--force-confold"  -y build-essential \
      nodejs \
      python3 && \
    apt-get clean -y && \
    rm -rf /var/lib/apt/lists/*


COPY --from=0 /opt/attic /opt/attic

COPY --from=1 /opt/vips /opt/vips

ARG NODE_OPTIONS="--max-old-space-size=2560"
ARG CORES=1
ENV DEBIAN_FRONTEND noninteractive

WORKDIR /opt/attic/attic-server

ENV PATH "$PATH:/opt/attic/attic-server/bin"

ENV PORT 80

ENV HOST '0.0.0.0'

VOLUME /etc/attic

ADD ./config /etc/attic
ADD ./docker-entrypoint.sh /docker-entrypoint.sh

ADD ./attic-marketplace-mods/package.json /opt/attic-marketplace-mods/package.json
ADD ./attic-marketplace-mods/package-lock.json /opt/attic-marketplace-mods/package-lock.json

RUN cd /opt/attic-marketplace-mods && \
    npm ci

ADD ./attic-marketplace-mods /opt/attic-marketplace-mods

RUN cd /opt/attic-marketplace-mods && \
    npm run build && \
    cd /opt/attic/attic-server && \
    npm ci && \
    npm install --no-save @etomon/attic-server-google @znetstar/attic-server-rest @znetstar/attic-server-s3 dotenv

ENV EMAIL_HOSTNAME social

ENV LOG_LEVEL "info"

EXPOSE 80

VOLUME /root/.jsipfs

ENTRYPOINT [ "/docker-entrypoint.sh" ]

CMD [ "attic-server",  "-f", "/etc/attic/config.json" ]
