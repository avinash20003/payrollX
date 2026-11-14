#!/bin/sh
set -eu

: "${PGHOST:=db}"
: "${PGPORT:=5432}"
: "${PGDATABASE:?PGDATABASE must be set}"
: "${PGUSER:?PGUSER must be the migration database role}"
: "${PGPASSWORD:?PGPASSWORD must be the migration database password}"
: "${APP_DB_USER:?APP_DB_USER must be set}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD must be set}"
: "${BOOTSTRAP_PGUSER:?BOOTSTRAP_PGUSER must be set}"
: "${BOOTSTRAP_PGPASSWORD:?BOOTSTRAP_PGPASSWORD must be set}"

if [ "$PGUSER" = "$APP_DB_USER" ] || [ "$PGUSER" = "$BOOTSTRAP_PGUSER" ] || [ "$APP_DB_USER" = "$BOOTSTRAP_PGUSER" ]; then
  echo "Bootstrap, migration, and application database roles must be different." >&2
  exit 1
fi

export PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD

bootstrap_psql() {
  PGPASSWORD="$BOOTSTRAP_PGPASSWORD" psql -X -v ON_ERROR_STOP=1 \
    -h "$PGHOST" -p "$PGPORT" -U "$BOOTSTRAP_PGUSER" -d "$PGDATABASE" "$@"
}

# The migration role owns DDL; the app role receives only runtime DML permissions.
bootstrap_psql \
  -v migration_user="$PGUSER" -v migration_password="$PGPASSWORD" \
  -v app_user="$APP_DB_USER" -v app_password="$APP_DB_PASSWORD" \
  -v app_db="$PGDATABASE" <<'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'migration_user', :'migration_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = :'migration_user')
\gexec
SELECT format(
  'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'migration_user', :'migration_password'
)
\gexec
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'app_user', :'app_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = :'app_user')
\gexec
SELECT format(
  'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'app_user', :'app_password'
)
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'app_db', :'migration_user')
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'app_db', :'app_user')
\gexec
GRANT USAGE, CREATE ON SCHEMA public TO :"migration_user";
GRANT USAGE ON SCHEMA public TO :"app_user";
SQL

psql -X -v ON_ERROR_STOP=1 -v app_user="$APP_DB_USER" <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
SQL

found=0
for migration in /migrations/*.sql; do
  [ -f "$migration" ] || continue
  found=1
  version=${migration##*/}
  case "$version" in
    *[!A-Za-z0-9_.-]*) echo "Invalid migration filename: $version" >&2; exit 1 ;;
  esac
  checksum=$(sha256sum "$migration" | cut -d ' ' -f 1)
  stored=$(psql -X -At -v ON_ERROR_STOP=1 -c \
    "SELECT checksum FROM public.schema_migrations WHERE version = '$version'")

  if [ -n "$stored" ]; then
    if [ "$stored" != "$checksum" ]; then
      echo "Migration checksum changed after application: $version" >&2
      exit 1
    fi
    echo "Already applied: $version"
    continue
  fi

  echo "Applying migration: $version"
  temp_file="/tmp/housekeeping-migration-$$.sql"
  trap 'rm -f "$temp_file"' EXIT HUP INT TERM
  {
    printf '%s\n' 'SELECT pg_advisory_xact_lock(732915480122);'
    printf "SELECT checksum = '%s' AS migration_current FROM public.schema_migrations WHERE version = '%s' \\gset\n" "$checksum" "$version"
    printf '%s\n' '\if :{?migration_current}'
    printf '%s\n' '\if :migration_current'
    printf '%s\n' "\\echo Already applied: $version"
    printf '%s\n' '\else'
    printf '%s\n' "\\echo Migration checksum changed after application: $version"
    printf '%s\n' '\quit 1'
    printf '%s\n' '\endif'
    printf '%s\n' '\else'
    printf '\\i %s\n' "$migration"
    printf '%s\n' 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";'
    printf '%s\n' 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";'
    printf '%s\n' 'REVOKE ALL ON public.schema_migrations FROM :"app_user";'
    printf "INSERT INTO public.schema_migrations (version, checksum) VALUES ('%s', '%s');\n" "$version" "$checksum"
    printf '%s\n' '\endif'
  } > "$temp_file"
  psql -X --single-transaction -v ON_ERROR_STOP=1 \
    -v app_user="$APP_DB_USER" -f "$temp_file"
  rm -f "$temp_file"
  trap - EXIT HUP INT TERM
done

if [ "$found" -eq 0 ]; then
  echo "No SQL migration files found in /migrations" >&2
  exit 1
fi

# Reconcile runtime grants every deploy, including when no new migration ran.
psql -X -v ON_ERROR_STOP=1 -v app_user="$APP_DB_USER" <<'SQL'
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
REVOKE ALL ON public.schema_migrations FROM :"app_user";
SQL

echo "Database migrations are up to date."
