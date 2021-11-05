FROM public.ecr.aws/znetstar/attic-server:3.8.0

FROM ubuntu:20.04

COPY --from=0 /opt/attic /opt/attic

ARG NODE_OPTIONS="--max-old-space-size=2560"
ARG CORES=1
ENV DEBIAN_FRONTEND noninteractive

WORKDIR /opt/attic/attic-server

RUN apt-get update -y && apt-get install -y curl && \
    bash -c 'curl -fsSL https://deb.nodesource.com/setup_14.x | bash -' && \
    apt-get update -y && \
    apt-get install -o Dpkg::Options::="--force-confold"  -y imagemagick \
      libvips-dev \
      build-essential \
      libvips-tools \
      nodejs \
      python3-gi \
      gir1.2-vips-8.0 \
      git  \
      gobject-introspection  \
      libjpeg-dev  \
      libpng-dev \
      libexif-dev \
      librsvg2-dev \
      libpoppler-glib-dev \
      libpng-dev \
      libwebp-dev \
      libopenexr-dev \
      libheif-dev \
      libtiff-dev \
      gtk-doc-tools && \
    git clone git://github.com/jcupitt/libvips.git /opt/vips && \
    cd /opt/vips && \
    ./autogen.sh && \
    make -j $CORES && \
    make install  && \
    ldconfig && \
    apt-get clean -y && \
    rm -rf /var/lib/apt/lists/*

ENV PATH "$PATH:/opt/attic/attic-server/bin"

ENV PORT 80

ENV HOST '0.0.0.0'

ADD ./config /etc/attic
ADD ./docker-entrypoint.sh /docker-entrypoint.sh
ADD ./attic-marketplace-mods /opt/attic-marketplace-mods

RUN cd /opt/attic-marketplace-mods && \
    npm ci && \
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
