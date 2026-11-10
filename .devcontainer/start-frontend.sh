#!/usr/bin/env sh
set -eu

# The backend initializes the shared volume with the editor user's UID/GID.
owner_uid="$(stat -c '%u' node_modules)"
owner_gid="$(stat -c '%g' node_modules)"
if [ "$owner_uid" = 0 ]; then
    owner_uid="$(id -u node)"
    owner_gid="$(id -g node)"
fi

npm ci --offline --cache /opt/npm-cache --no-audit --no-fund

if [ "$(id -u node)" != "$owner_uid" ]; then
    usermod --uid "$owner_uid" node
fi
if ! getent group "$owner_gid" >/dev/null; then
    groupadd --gid "$owner_gid" "node-workspace-${owner_gid}"
fi
usermod --gid "$owner_gid" node
chown -R "${owner_uid}:${owner_gid}" /home/node node_modules

# Run Vite with the same ownership as editor-created frontend build files.
export HOME=/home/node USER=node LOGNAME=node
exec gosu node npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
