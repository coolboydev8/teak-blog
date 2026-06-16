#!/usr/bin/env bash
set -e

echo "Waiting for database..."
python - <<'PY'
import os, socket, time, urllib.parse
url = urllib.parse.urlparse(os.environ.get("DATABASE_URL", ""))
host, port = url.hostname or "db", url.port or 5432
for _ in range(60):
    try:
        with socket.create_connection((host, port), timeout=2):
            break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit(f"Database {host}:{port} not reachable")
print(f"Database {host}:{port} is up")
PY

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "Applying migrations..."
  python manage.py migrate --noinput
fi

exec "$@"
