FROM node:22.22.0-bookworm-slim AS installer

ARG PNPM_VERSION=10.13.1
ARG SERVER_TARBALL_URL=https://github.com/Ravonus/velatis-charts/releases/download/v0.2.0/velatis-charts-server-0.2.0.tgz
ARG SERVER_TARBALL_SHA256=56f334aa8c05581886417999e99382e82c1653e843dc40d91ccca0e4b608c0cd

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates curl g++ make python3 \
  && rm -rf /var/lib/apt/lists/*
RUN npm install --global "pnpm@${PNPM_VERSION}"

WORKDIR /opt/velatis-charts
RUN curl --fail --location --silent --show-error \
    "${SERVER_TARBALL_URL}" \
    --output velatis-charts-server.tgz \
  && echo "${SERVER_TARBALL_SHA256}  velatis-charts-server.tgz" | sha256sum --check \
  && printf '{"name":"velatis-charts-runtime","private":true,"version":"0.0.0"}\n' > package.json \
  && pnpm add --allow-build=swisseph-v2 ./velatis-charts-server.tgz \
  && rm velatis-charts-server.tgz \
  && pnpm store prune

FROM node:22.22.0-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /opt/velatis-charts

COPY --from=installer --chown=node:node /opt/velatis-charts ./

USER node
EXPOSE 4321

HEALTHCHECK --interval=15s --timeout=10s --start-period=10s --retries=5 \
  CMD ["node", "-e", "const response=await fetch('http://127.0.0.1:4321/api/v1/ephemeris',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation:'positions',input:{samples:[{julianDay:2461231,bodyIds:[0]}]}}),signal:AbortSignal.timeout(8000)});if(!response.ok)process.exit(1);const body=await response.json();if(body.engine?.name!=='Swiss Ephemeris'||!Number.isFinite(body.result?.[0]?.positions?.[0]?.longitude))process.exit(1)"]

ENTRYPOINT ["node", "node_modules/@velatis/charts-server/dist/cli.js"]
CMD ["serve", "--host", "127.0.0.1", "--port", "4321"]
