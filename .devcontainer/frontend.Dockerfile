# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim

WORKDIR /opt/tfc-frontend
COPY frontend/package.json frontend/package-lock.json ./
# Cache the exact lockfile dependencies at build time, so startup is offline.
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --cache /opt/npm-cache --no-audit --no-fund \
    && rm -rf node_modules
