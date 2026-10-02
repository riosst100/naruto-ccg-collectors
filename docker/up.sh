#!/usr/bin/env bash
# Convenience wrapper (run inside WSL): bash docker/up.sh [extra docker compose args, e.g. --build]
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -f docker/compose.env ]] || bash docker/setup-wsl.sh
exec docker compose --env-file docker/compose.env up -d "$@"
