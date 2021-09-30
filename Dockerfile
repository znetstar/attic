FROM ubuntu:20.04

RUN apt-get install rust

RUN bash -c 'curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh'
