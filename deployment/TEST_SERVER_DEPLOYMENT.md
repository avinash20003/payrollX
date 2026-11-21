# PayrollX Linux test server deployment

This procedure deploys the combined frontend and backend image with PostgreSQL on a Linux host running Docker Engine and Compose v2. PostgreSQL data is stored in the external Docker volume named by `POSTGRES_VOLUME_NAME`; rebuilding or replacing the app container does not remove that volume.

## 1. Prepare the host and checkout

Install Docker Engine and the Docker Compose v2 plugin using the instructions for the Linux distribution. Add the deployment account to the Docker group or use `sudo` consistently. Clone or copy the project into a persistent directory such as `/opt/payrollx`, then run the remaining commands from that directory.

Check Docker and Compose:

```sh
docker version
docker compose version
```

Create a private environment file from the template. Do not copy credentials from a developer `.env` file into source control:

```sh
cp deployment/.env.example deployment/.env
chmod 600 deployment/.env
```

Edit `deployment/.env`. Replace each `CHANGE_ME` value with a unique secret. `APP_DB_PASSWORD` must be URL-safe; a hexadecimal value from `openssl rand -hex 32` works. Set `ADMIN_PASSWORD` to at least 12 characters. Keep the file on the server and out of Git.

For a new, empty test database, use a new volume name and set `POSTGRES_VOLUME_NAME` to that name in `deployment/.env`. For an existing PayrollX database, first identify its exact Docker volume and set `POSTGRES_VOLUME_NAME` to it. Also set `POSTGRES_USER` and `POSTGRES_PASSWORD` to the bootstrap credentials used when that volume was first initialized. Editing those values cannot change credentials already stored in PostgreSQL.

Inspect known volumes before choosing:

```sh
docker volume ls
docker volume inspect payrollx_postgres_data
```

The deployment script checks the selected volume's PostgreSQL major version and refuses ambiguous, unknown, or incompatible data directories. PostgreSQL 17 data must be migrated with a verified `pg_dump` into a separate PostgreSQL 18 volume; never point PostgreSQL 18 at PostgreSQL 17 files. Keep the source volume untouched until the restored data is verified.

## 2. First deployment and updates

For the first deployment, the safety script creates the default empty `payrollx_postgres_data` volume only when no existing PAYROLLX data volume needs selection. It validates the volume and configuration, builds the app without cache, starts PostgreSQL, waits for health, then starts the app. Startup runs checksum-verified migrations and idempotent administrator initialization before serving traffic:

```sh
sh deployment/deploy.sh
```

The direct Compose command is also supported. The Compose build is configured with `no_cache: true`, so `--build` builds from the current checkout:

```sh
docker compose --env-file deployment/.env -f deployment/docker-compose.yml up -d --build
```

There are two services: `app` and `db`. The app is published on `${HTTP_BIND_ADDRESS:-0.0.0.0}:${HTTP_PORT:-8080}`; PostgreSQL is not published to the host. The default test URL is `http://SERVER_INTERNAL_IP:8080`.

Use `docker compose down` only when both services should stop. It preserves the external database volume. Never use `docker compose down -v`, remove the selected PostgreSQL volume, or run a destructive database migration.

## 3. Verify deployment

Check Compose status and health:

```sh
docker compose --env-file deployment/.env -f deployment/docker-compose.yml ps
docker compose --env-file deployment/.env -f deployment/docker-compose.yml logs --tail=150 app db
curl --fail http://127.0.0.1:8080/api/health
curl --fail http://127.0.0.1:8080/login
```

The app health endpoint returns HTTP 200 only when it can query PostgreSQL. The startup log should show database readiness, migrations up to date, administrator initialization, and both Next.js servers running. Check migration history without changing data:

```sh
docker compose --env-file deployment/.env -f deployment/docker-compose.yml exec -T db \
  psql -U "$(sed -n 's/^POSTGRES_USER=//p' deployment/.env)" \
  -d "$(sed -n 's/^POSTGRES_DB=//p' deployment/.env)" \
  -c 'SELECT version, applied_at FROM public.schema_migrations ORDER BY version;'
```

Sign in with the configured administrator. Verify Employee Master search, department and status filters, pagination, create/edit/activate/deactivate; import a small `.xls` and `.xlsx` workbook containing valid, invalid, and duplicate employee codes and confirm that accepted rows appear while failures are shown and downloadable. Check salary entry and department-wise salary tables, including horizontal and vertical scrolling and sticky headers. Compare any salary test values with the approved payroll examples; the salary calculation code is unchanged by this deployment work.

## 4. Backups

Create a verified PostgreSQL custom-format backup before each update and retain copies outside the server as well:

```sh
sh deployment/backup.sh
```

The script writes a timestamped `.dump` under `deployment/backups/`, applies restrictive file permissions, and verifies the archive with `pg_restore --list`. Schedule it daily with cron using the checkout's absolute path, for example:

```cron
0 2 * * * cd /opt/payrollx && /bin/sh deployment/backup.sh >> deployment/backups/cron.log 2>&1
```

The cron account must be able to access Docker, `deployment/.env`, and the backup directory. Copy verified backups to separate protected storage.

## 5. Update and verify

Before updating, create and verify a backup. Preserve the running image as a rollback image, then update the checkout using the team's approved source-control procedure:

```sh
sh deployment/backup.sh
docker image tag payrollx-app:local payrollx-app:rollback
```

After updating the source files, build and start the new version:

```sh
sh deployment/deploy.sh
```

Alternatively, use the direct Compose command above. Repeat the health, login, Employee Master, import, salary, and migration-history checks. Keep the rollback image and pre-update backup until verification is complete.

## 6. Roll back

If only the app code needs to be rolled back and the database schema remains compatible with that app image, restore the preserved image tag and recreate only the app service:

```sh
docker image tag payrollx-app:rollback payrollx-app:local
docker compose --env-file deployment/.env -f deployment/docker-compose.yml up -d --no-deps app
```

Do not roll back application code across a schema change unless that older app version supports the migrated schema. If data restoration is necessary, first preserve the current database with `sh deployment/backup.sh`, then use the interactive restore procedure. Restore replaces database contents, requires typing the database-specific confirmation, and creates another safety backup first:

```sh
sh deployment/restore.sh payrollx_YYYY-MM-DD_HHMMSS.dump
```

Never delete the PostgreSQL volume during rollback. Verify the application and records after recovery.

## Security and persistence notes

- `deployment/.env`, root `.env`, backups, and local credentials must remain untracked. The Docker build context excludes environment files, dependency directories, Git data, and backups.
- PostgreSQL is reachable only on the internal Compose network. The app container drops its migration/bootstrap/admin secrets before starting the web processes.
- For a trusted TLS-terminating reverse proxy, bind the app to `127.0.0.1` and set `TRUST_PROXY_HEADERS=true` only when that proxy overwrites `X-Forwarded-Proto`.
- The database volume is external and is not removed by app rebuilds or ordinary `docker compose down`. Backups are still required for recovery from host or storage failure.
- Schema changes belong in a new migration file. Applied migration files are checksum-verified; do not edit or rerun an applied migration.
