#!/bin/sh

DEPLOYMENT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$DEPLOYMENT_DIR/.." && pwd)
ENV_FILE="$DEPLOYMENT_DIR/.env"
COMPOSE_FILE=${PAYROLLX_COMPOSE_FILE:-"$DEPLOYMENT_DIR/docker-compose.yml"}

env_file_value() {
  key=$1
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1 | tr -d '\r'
}

resolve_postgres_volume() {
  mode=${1:-existing}
  configured=${POSTGRES_VOLUME_NAME:-$(env_file_value POSTGRES_VOLUME_NAME)}

  if [ -n "$configured" ]; then
    case "$configured" in
      *[!A-Za-z0-9_.-]*) echo "Invalid POSTGRES_VOLUME_NAME in deployment/.env." >&2; return 1 ;;
    esac
    if ! docker volume inspect "$configured" >/dev/null 2>&1; then
      allow_new=${ALLOW_NEW_DATABASE:-$(env_file_value ALLOW_NEW_DATABASE)}
      if [ "$allow_new" = true ] && [ "$configured" = payrollx_postgres_data ]; then
        if [ "$mode" = create ]; then
          docker volume create payrollx_postgres_data >/dev/null
          printf '%s\n' payrollx_postgres_data
          return 0
        fi
        echo "ALLOW_NEW_DATABASE=true explicitly selects a new empty PAYROLLX volume." >&2
        return 2
      fi
      for candidate in payrollx-salary_postgres_data housekeeping-salary_postgres_data; do
        if docker volume inspect "$candidate" >/dev/null 2>&1; then
          echo "Configured PostgreSQL volume '$configured' does not exist, and existing volume '$candidate' needs an explicit data migration or selection." >&2
          return 1
        fi
      done
      if [ "$mode" = create ] && [ "$configured" = payrollx_postgres_data ]; then
        docker volume create payrollx_postgres_data >/dev/null
        printf '%s\n' payrollx_postgres_data
        return 0
      fi
      echo "Configured PostgreSQL volume '$configured' does not exist. Refusing to create an empty replacement." >&2
      return 2
    fi
    printf '%s\n' "$configured"
    return 0
  fi

  candidates=
  for candidate in payrollx_postgres_data payrollx-salary_postgres_data housekeeping-salary_postgres_data; do
    if docker volume inspect "$candidate" >/dev/null 2>&1; then
      candidates="$candidates $candidate"
    fi
  done

  set -- $candidates
  if [ "$#" -eq 1 ]; then
    printf '%s\n' "$1"
    return 0
  fi

  if [ "$#" -gt 1 ]; then
    echo "More than one existing PAYROLLX PostgreSQL volume was found:$candidates" >&2
    echo "Set POSTGRES_VOLUME_NAME in deployment/.env to the volume that contains the database records to keep." >&2
    return 1
  fi

  if [ "$mode" = create ]; then
    docker volume create payrollx_postgres_data >/dev/null
    printf '%s\n' payrollx_postgres_data
    return 0
  fi

  echo "No PAYROLLX PostgreSQL volume exists. Refusing to run against a new empty database." >&2
  return 2
}

compose() {
  POSTGRES_VOLUME_NAME="$DB_VOLUME_NAME" \
    docker compose --project-name "${PAYROLLX_PROJECT_NAME:-payrollx}" \
      --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

log_message() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}
