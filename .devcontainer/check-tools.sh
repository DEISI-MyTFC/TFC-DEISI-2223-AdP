#!/usr/bin/env bash
set -euo pipefail

python --version
node --version
npm --version
sqlite3 --version
docker --version
docker compose version
docker info --format 'Docker Engine {{.ServerVersion}} is reachable'
command -v socat
python "$(dirname "$0")/check-forwarded-services.py"
