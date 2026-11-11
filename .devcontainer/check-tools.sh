#!/usr/bin/env bash
set -euo pipefail

python --version
python -c "import sys; assert sys.prefix == '/opt/venv', f'Wrong Python environment: {sys.executable}'; print(f'Python environment: {sys.prefix}')"
python -m pip check
python -m django --version
node --version
npm --version
sqlite3 --version
docker --version
docker compose version
docker info --format 'Docker Engine {{.ServerVersion}} is reachable'
command -v socat
python "$(dirname "$0")/check-forwarded-services.py"
