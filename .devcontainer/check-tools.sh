#!/usr/bin/env bash
set -euo pipefail

python --version
node --version
npm --version
sqlite3 --version
docker --version
docker compose version
docker info --format 'Docker Engine {{.ServerVersion}} is reachable'
