# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS node_tools
FROM docker:28-cli AS docker_tools
FROM python:3.13-slim-bookworm

# Copy tools and install dependencies in one layer to keep the dev image small.
RUN --mount=from=node_tools,source=/usr/local,target=/tmp/node-tools,ro \
    --mount=from=docker_tools,source=/usr/local,target=/tmp/docker-tools,ro \
    --mount=type=bind,source=backend/requirements.txt,target=/tmp/tfc-requirements.txt,ro \
    --mount=type=bind,source=.devcontainer/dev-entrypoint.sh,target=/tmp/tfc-entrypoint.sh,ro \
    --mount=type=secret,id=proxy_ca \
    apt-get update \
    && apt-get install -y --no-install-recommends bash ca-certificates curl git gosu libstdc++6 openssh-client procps sudo \
    && rm -rf /var/lib/apt/lists/* \
    && install -m 0755 /tmp/node-tools/bin/node /usr/local/bin/node \
    && install -d /usr/local/lib/node_modules /usr/local/libexec/docker \
    && cp -a /tmp/node-tools/lib/node_modules/npm /usr/local/lib/node_modules/npm \
    && install -m 0755 /tmp/docker-tools/bin/docker /usr/local/bin/docker \
    && cp -a /tmp/docker-tools/libexec/docker/cli-plugins /usr/local/libexec/docker/cli-plugins \
    && ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && groupadd --gid 1000 vscode \
    && useradd --uid 1000 --gid vscode --create-home --shell /bin/bash vscode \
    && echo 'vscode ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/vscode \
    && chmod 0440 /etc/sudoers.d/vscode \
    && install -m 0755 /tmp/tfc-entrypoint.sh /usr/local/bin/tfc-dev-entrypoint \
    && if [ -f /run/secrets/proxy_ca ]; then export PIP_CERT=/run/secrets/proxy_ca; fi \
    && python -m pip install --no-cache-dir -r /tmp/tfc-requirements.txt

ENV HOME=/home/vscode
ENTRYPOINT ["/usr/local/bin/tfc-dev-entrypoint"]
