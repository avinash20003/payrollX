#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$SCRIPT_DIR/lib.sh"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing deployment/.env." >&2
  exit 1
fi
if [ "$#" -ne 1 ]; then
  echo "Usage: sh deployment/restore.sh <backup-file>" >&2
  echo "A relative filename without a directory is looked up in deployment/backups/." >&2
  exit 2
fi

case "$1" in
  /*) RESTORE_FILE=$1 ;;
  */*) RESTORE_FILE=$(CDPATH= cd -- "$(dirname -- "$1")" && pwd)/$(basename -- "$1") ;;
  *) RESTORE_FILE="${PAYROLLX_BACKUP_DIR:-"$SCRIPT_DIR/backups"}/$1" ;;
esac
if [ ! -f "$RESTORE_FILE" ] || [ ! -r "$RESTORE_FILE" ]; then
  echo "Backup file does not exist or cannot be read: $RESTORE_FILE" >&2
  exit 1
fi

DB_VOLUME_NAME=$(resolve_postgres_volume existing)
compose config --quiet
if ! compose ps --status running --services | grep -qx db; then
  echo "The PostgreSQL container is not running. Start it with deployment/deploy.sh first." >&2
  exit 1
fi
if ! compose exec -T db pg_restore --list < "$RESTORE_FILE" >/dev/null; then
  echo "The selected file is not a readable PostgreSQL custom-format backup." >&2
  exit 1
fi

database=$(env_file_value POSTGRES_DB)
if [ ! -t 0 ]; then
  echo "Restore replaces database contents and requires an interactive confirmation." >&2
  exit 1
fi
printf 'This will replace all contents of database %s. Type RESTORE %s to continue: ' "$database" "$database" >&2
IFS= read -r confirmation
if [ "$confirmation" != "RESTORE $database" ]; then
  echo "Confirmation did not match; no data was changed." >&2
  exit 1
fi

BACKUP_DIR=${PAYROLLX_BACKUP_DIR:-"$SCRIPT_DIR/backups"}
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
log_restore() {
  log_message "$*" | tee -a "$BACKUP_DIR/restore.log"
}

log_restore "Creating a safety backup before restore."
POSTGRES_VOLUME_NAME="$DB_VOLUME_NAME" PAYROLLX_BACKUP_DIR="$BACKUP_DIR" sh "$SCRIPT_DIR/backup.sh"

log_restore "Stopping the application while the database is restored. PostgreSQL stays running."
compose stop app
log_restore "Restoring from $RESTORE_FILE"
if ! compose exec -T \
  -e "POSTGRES_USER=$(env_file_value POSTGRES_USER)" \
  -e "POSTGRES_DB=$database" \
  db sh -c 'pg_restore --clean --if-exists --exit-on-error --single-transaction --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' < "$RESTORE_FILE"; then
  log_restore "Restore failed. The application remains stopped; inspect database logs before restarting it." >&2
  exit 1
fi

log_restore "Restore completed. Starting the application and checking health."
compose up --detach app
attempt=0
while [ "$attempt" -lt 60 ]; do
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' payrollx-app 2>/dev/null || true)
  if [ "$health" = healthy ]; then
    log_restore "Restored database is serving the application."
    exit 0
  fi
  if [ "$health" = unhealthy ] || [ "$health" = exited ]; then
    compose logs --tail=80 app >&2
    echo "Application did not become healthy after restore." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done
compose logs --tail=80 app >&2
echo "Timed out waiting for the application after restore." >&2
exit 1
