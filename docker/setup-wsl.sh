#!/usr/bin/env bash
# Prepares the WSL side: data directory (database + uploads) on the Linux filesystem and docker/compose.env.
# Run from inside WSL:  bash docker/setup-wsl.sh [--import-dev-data]
set -euo pipefail

cd "$(dirname "$0")/.."
DATA_DIR="${DATA_DIR:-$HOME/naruto-ccg-data}"
ENV_FILE="docker/compose.env"

mkdir -p "$DATA_DIR/uploads"

if [[ "${1:-}" == "--import-dev-data" ]]; then
  if [[ -f data/dev.db && ! -f "$DATA_DIR/naruto.db" ]]; then
    cp data/dev.db "$DATA_DIR/naruto.db"
    echo "Imported data/dev.db -> $DATA_DIR/naruto.db"
  fi
  if [[ -d uploads ]]; then
    cp -rn uploads/. "$DATA_DIR/uploads/"
    echo "Imported uploads/ -> $DATA_DIR/uploads/"
  fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<EOF
DATA_DIR=$DATA_DIR
APP_UID=$(id -u)
APP_GID=$(id -g)
WEB_PORT=3000
ADMIN_PORT=3001
PROXY_PORT=8080
PROXY_BIND=127.0.0.1
COOKIE_SECURE=false
EOF
  echo "Wrote $ENV_FILE"
fi

echo "Data directory: $DATA_DIR  (Windows: \\\\wsl\$\\${WSL_DISTRO_NAME:-Ubuntu}${DATA_DIR//\//\\})"
echo "Next: docker compose --env-file $ENV_FILE up -d --build"
