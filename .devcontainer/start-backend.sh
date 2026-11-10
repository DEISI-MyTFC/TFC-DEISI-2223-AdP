#!/usr/bin/env bash
set -euo pipefail

python manage.py migrate --database=auth_db --noinput
python manage.py migrate --database=default --noinput

# Codespaces forwards numeric ports from the editor container's localhost.
# Relay the other services without publishing database ports on the Docker host.
children=()
cleanup() {
    trap - EXIT
    if [ "${#children[@]}" -gt 0 ]; then
        # Stop process groups, including active relay connections and Django's reloader.
        for child in "${children[@]}"; do
            kill -- "-$child" 2>/dev/null || true
        done
        wait "${children[@]}" 2>/dev/null || true
    fi
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

setsid socat TCP4-LISTEN:5432,bind=127.0.0.1,reuseaddr,fork TCP:bdtfc:5432 &
children+=("$!")
setsid socat TCP4-LISTEN:5173,bind=127.0.0.1,reuseaddr,fork TCP:frontend:5173 &
children+=("$!")
setsid python manage.py runserver 0.0.0.0:8000 &
children+=("$!")

# Restart the container if a relay or Django exits; stop the other children too.
wait -n "${children[@]}"
