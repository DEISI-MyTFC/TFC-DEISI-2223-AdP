#!/usr/bin/env bash
set -euo pipefail

python manage.py migrate --database=auth_db --noinput
python manage.py migrate --database=default --noinput
exec python manage.py runserver 0.0.0.0:8000
