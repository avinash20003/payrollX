#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="$ROOT_DIR/deployment/.env"
MODE=${1:-local}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy deployment/.env.example and set the required secrets." >&2
  exit 1
fi

case "$MODE" in
  local)
    COMPOSE_FILE="$ROOT_DIR/deployment/docker-compose.yml"
    PRODUCTION=0
    ;;
  production)
    COMPOSE_FILE="$ROOT_DIR/deployment/docker-compose.prod.yml"
    PRODUCTION=1
    ;;
  *)
    echo "Usage: sh deployment/deploy.sh [local|production]" >&2
    exit 2
    ;;
esac

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# Validate all required secrets and Compose values before building or pulling.
compose config --quiet

if [ "$PRODUCTION" -eq 1 ]; then
  compose pull backend frontend nginx
else
  compose build backend frontend nginx
fi

# Keep requests out while applying database changes and replacing app containers.
compose stop nginx frontend backend

# Recreate the one-shot containers so newly added migrations are always checked.
compose rm --force --stop migrate admin-create

# Compose dependencies enforce: db -> migrate -> admin-create -> backend -> frontend -> nginx.
compose up --detach
