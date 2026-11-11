#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
venv=/opt/venv
python="$venv/bin/python"

if [ ! -x "$python" ]; then
    echo "The managed Python environment is missing. Rebuild the Codespace container to apply this configuration." >&2
    exit 1
fi

# Serialize startup and manual setup so pip and migrations cannot overlap.
exec 9> "$venv/.setup.lock"
flock 9

cd "$repo_dir/backend"
requirements_hash="$(sha256sum < requirements.txt | cut -d ' ' -f1)"
installed_hash="$(cat "$venv/.requirements.sha256" 2>/dev/null || true)"
if [ "$requirements_hash" != "$installed_hash" ]; then
    echo "Installing updated backend requirements into $venv"
    "$python" -m pip install -r requirements.txt
    "$python" -m pip check
    printf '%s\n' "$requirements_hash" > "$venv/.requirements.sha256"
else
    echo "Backend requirements are already installed in $venv"
    "$python" -m pip check
fi

"$python" manage.py migrate --database=auth_db --noinput
"$python" manage.py migrate --database=default --noinput
