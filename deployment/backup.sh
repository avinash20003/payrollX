#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$SCRIPT_DIR/lib.sh"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing deployment/.env." >&2
  exit 1
fi

DB_VOLUME_NAME=$(resolve_postgres_volume existing)
compose config --quiet
if ! compose ps --status running --services | grep -qx db; then
  echo "The PostgreSQL container is not running. Start it with deployment/deploy.sh first." >&2
  exit 1
fi
if ! compose exec -T db pg_isready -U "$(env_file_value POSTGRES_USER)" -d "$(env_file_value POSTGRES_DB)" >/dev/null; then
  echo "PostgreSQL is not ready; no backup was created." >&2
  exit 1
fi

BACKUP_DIR=${PAYROLLX_BACKUP_DIR:-"$SCRIPT_DIR/backups"}
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077
log_backup() {
  log_message "$*" | tee -a "$BACKUP_DIR/backup.log"
}
timestamp=$(date -u '+%Y-%m-%d_%H%M%S')
backup_file="$BACKUP_DIR/payrollx_${timestamp}.dump"
temporary_file=$(mktemp "$BACKUP_DIR/.payrollx_${timestamp}.XXXXXX")
trap 'rm -f "$temporary_file"' EXIT HUP INT TERM

log_backup "Starting PostgreSQL custom-format backup."
if ! compose exec -T \
  -e "POSTGRES_USER=$(env_file_value POSTGRES_USER)" \
  -e "POSTGRES_DB=$(env_file_value POSTGRES_DB)" \
  db sh -c 'pg_dump --format=custom --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' > "$temporary_file"; then
  log_backup "Backup failed while pg_dump was reading the database." >&2
  exit 1
fi

if ! compose exec -T db pg_restore --list < "$temporary_file" >/dev/null; then
  log_backup "Backup verification failed; the incomplete file was not published." >&2
  exit 1
fi

if ! ln "$temporary_file" "$backup_file"; then
  log_backup "Backup filename already exists; refusing to overwrite it." >&2
  exit 1
fi
rm -f "$temporary_file"
trap - EXIT HUP INT TERM
log_backup "Backup verified and saved: $backup_file"
