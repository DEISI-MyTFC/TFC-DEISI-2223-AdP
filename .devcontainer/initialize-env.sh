#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$repo_dir/.env"

# This runs on the Codespaces host before Compose reads the environment file.
if [ -e "$env_file" ] || [ -L "$env_file" ]; then
    echo "Preserving existing root .env"
else
    umask 077
    cp -- "$repo_dir/.devcontainer/.env.example" "$env_file"
    echo "Created root .env from the Codespaces development template"
fi
