FROM ubuntu:20.04

WORKDIR /opt/attic/attic-server

ADD ./package.json /opt/attic/attic-server/package.json
ADD ./package-lock.json /opt/attic/attic-server/package-lock.json

RUN apt-get update -y && \
    apt-get install -y curl && \
    bash -c 'curl -fsSL https://deb.nodesource.com/setup_12.x | bash -' && \
    apt-get install -y nodejs build-essential python2 python3 && \
    rm -rf /var/lib/apt/lists/* && \
    npm ci

ADD . /opt/attic/attic-server

RUN npm run build

RUN ln -s /opt/attic/attic-server/bin/attic-server /usr/local/bin/attic-server

ENV PATH "/usr/local/bin:/opt/attic/attic-server/bin:$PATH"

ENV UPLOAD_TEMP_DIR /tmp/attic/uploads

VOLUME /root/.jsipfs

EXPOSE 7373

ENTRYPOINT [ "/usr/local/bin/attic-server" ]
