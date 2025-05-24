FROM ghcr.io/foundry-rs/foundry

WORKDIR /app
COPY . .

RUN forge build

ENTRYPOINT ["forge", "script", "script/Deploy.s.sol", "--broadcast"]
