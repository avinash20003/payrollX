#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$SCRIPT_DIR/lib.sh"

fail() {
  echo "Deployment stopped: $*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker is not installed or is not on PATH."
docker info >/dev/null 2>&1 || fail "Docker is unavailable or the current user cannot access the Docker daemon."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."
[ -f "$ENV_FILE" ] || fail "Missing deployment/.env. Copy deployment/.env.example and set its values."

if DB_VOLUME_NAME=$(resolve_postgres_volume existing); then
  newly_created_volume=0
else
  resolve_status=$?
  [ "$resolve_status" -eq 2 ] || exit "$resolve_status"
  DB_VOLUME_NAME=$(resolve_postgres_volume create) || exit 1
  newly_created_volume=1
fi

if ! services=$(compose config --services); then
  fail "Compose configuration is invalid. Check required deployment/.env values."
fi
expected_services=$(printf 'app\ndb\n')
actual_services=$(printf '%s\n' "$services" | sort)
[ "$actual_services" = "$expected_services" ] || fail "The Compose project must contain exactly app and db services."

if [ "$newly_created_volume" -eq 0 ]; then
  database_major=$(docker run --rm --network none \
    --volume "$DB_VOLUME_NAME:/inspect:ro" \
    --entrypoint sh alpine:3.24 -c '
      for version_file in /inspect/18/docker/PG_VERSION /inspect/PG_VERSION /inspect/data/PG_VERSION; do
        if [ -r "$version_file" ]; then cat "$version_file"; exit 0; fi
      done
      printf empty
    ') || fail "Could not inspect the selected PostgreSQL volume."
  case "$database_major" in
    18) log_message "Selected volume $DB_VOLUME_NAME contains PostgreSQL 18 data." ;;
    17)
      fail "Volume $DB_VOLUME_NAME contains PostgreSQL 17 data. PostgreSQL 18 cannot open it directly; take and verify a PostgreSQL 17 pg_dump backup, then restore into a new PostgreSQL 18 volume. The source volume was left untouched."
      ;;
    empty)
      if [ "${ALLOW_NEW_DATABASE:-$(env_file_value ALLOW_NEW_DATABASE)}" = true ]; then
        log_message "Explicit ALLOW_NEW_DATABASE=true permits initialization of the selected empty volume; older volumes remain untouched."
      else
        fail "Selected existing volume $DB_VOLUME_NAME is empty. Refusing to initialize over an unverified volume. Set POSTGRES_VOLUME_NAME to the intended data volume, or explicitly set ALLOW_NEW_DATABASE=true for a new database."
      fi
      ;;
    *) fail "Selected volume $DB_VOLUME_NAME has an unrecognized PostgreSQL data layout (version: $database_major). No database container was started." ;;
  esac
else
  log_message "Created the new empty volume payrollx_postgres_data for first-time initialization."
fi

running_mounts=$(docker ps --filter "volume=$DB_VOLUME_NAME" --format '{{.Names}}')
for container_name in $running_mounts; do
  [ "$container_name" = payrollx-db ] || fail "Volume $DB_VOLUME_NAME is already mounted by running container $container_name. Stop and migrate that database safely before deployment."
done

compose config --quiet || fail "Compose configuration is invalid."
log_message "Building the combined application image."
compose build app

log_message "Starting PostgreSQL without stopping any currently running database container."
compose up --detach db
attempt=0
while [ "$attempt" -lt 90 ]; do
  database_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' payrollx-db 2>/dev/null || true)
  [ "$database_health" = healthy ] && break
  if [ "$database_health" = unhealthy ] || [ "$database_health" = exited ]; then
    compose logs --tail=100 db >&2
    fail "PostgreSQL did not pass its health check."
  fi
  attempt=$((attempt + 1))
  sleep 2
done
[ "$database_health" = healthy ] || fail "Timed out waiting for PostgreSQL health."

log_message "Starting the application. Startup runs the existing migrations and idempotent administrator initialization before opening HTTP."
compose up --detach --no-deps app
attempt=0
while [ "$attempt" -lt 90 ]; do
  app_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' payrollx-app 2>/dev/null || true)
  [ "$app_health" = healthy ] && break
  if [ "$app_health" = unhealthy ] || [ "$app_health" = exited ]; then
    compose logs --tail=120 app >&2
    fail "The application failed startup or did not become healthy. PostgreSQL volume was preserved."
  fi
  attempt=$((attempt + 1))
  sleep 2
done
[ "$app_health" = healthy ] || {
  compose logs --tail=120 app >&2
  fail "Timed out waiting for application health. PostgreSQL volume was preserved."
}

running_services=$(compose ps --status running --services | sort)
[ "$running_services" = "$expected_services" ] || fail "Expected exactly two running services (app and db), found: $running_services"

http_port=${HTTP_PORT:-$(env_file_value HTTP_PORT)}
[ -n "$http_port" ] || http_port=8080
server_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
log_message "Deployment is healthy."
compose ps
echo "Application URL: http://${server_ip:-SERVER_INTERNAL_IP}:${http_port}"
