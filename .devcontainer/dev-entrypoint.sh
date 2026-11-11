#!/usr/bin/env bash
set -euo pipefail

# Match the host socket's group without changing the socket's permissions.
if [ -S /var/run/docker.sock ]; then
    socket_gid="$(stat -c '%g' /var/run/docker.sock)"
    socket_group="$(getent group "$socket_gid" | cut -d: -f1 || true)"
    if [ -z "$socket_group" ]; then
        socket_group="docker-host-${socket_gid}"
        groupadd --gid "$socket_gid" "$socket_group"
    fi
    usermod --append --groups "$socket_group" vscode
fi

# Share writable frontend dependencies with the editor and terminal tools.
modules=/workspaces/TFC-DEISI-2223-AdP/frontend/node_modules
if [ -d "$modules" ]; then
    chown -R vscode:vscode "$modules"
fi

# Group setup needs root; the application runs as the development user.
export HOME=/home/vscode USER=vscode LOGNAME=vscode
exec gosu vscode "$@"
