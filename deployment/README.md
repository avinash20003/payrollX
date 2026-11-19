# PAYROLLX deployment

The deployment runs exactly two services: `app` and `db`. The app image contains the backend Next.js API, the frontend Next.js site, and a startup supervisor. The backend Next.js server handles `/api/*` routes and proxies the remaining paths to the frontend server with a fallback rewrite. Both servers, migrations, and administrator initialization run in the `payrollx-app` container. PostgreSQL runs in `payrollx-db` and is reachable only on the internal Compose network.

## Configure and deploy

Create the environment file once, then set unique values for all secrets:

```sh
cp deployment/.env.example deployment/.env
```

`APP_DB_PASSWORD` must be URL-safe because it is also used in `DATABASE_URL`. `POSTGRES_USER` and `POSTGRES_PASSWORD` must match the credentials used when the selected database volume was first initialized. Changing those values in `.env` does not change credentials inside an existing volume. The startup migration reports an authentication mismatch and stops without changing the volume.

Set `POSTGRES_VOLUME_NAME` to the Docker volume containing the records to preserve. If the script finds more than one known PAYROLLX volume, it stops and asks you to choose; it never guesses. Before starting PostgreSQL, it mounts the selected volume read-only to check its data version. A PostgreSQL 17 volume is not started with PostgreSQL 18: make and verify a `pg_dump` using PostgreSQL 17, select a separate PostgreSQL 18 volume, restore the backup, and retain the source volume until the restored records are verified. `ALLOW_NEW_DATABASE=true` is an explicit opt-in for initializing an empty canonical volume; it does not remove or modify older volumes. Do not set it when the intended source records have not been backed up and identified.

PostgreSQL 18 stores its data under `/var/lib/postgresql/18/docker`; the persistent volume is mounted at `/var/lib/postgresql`, as required by the official image. The deployment scripts never run `docker compose down -v` or remove a Docker volume.

Deploy or safely repeat an application update:

```sh
sh deployment/deploy.sh
```

The script checks Docker and Compose, validates configuration and volume compatibility, builds the combined app image, starts PostgreSQL, waits for its health check, and starts the app. App startup waits for PostgreSQL, runs the existing checksum and locking migration runner, runs the existing idempotent admin initializer, then starts both Next.js production servers. If a migration or either server fails, startup exits and Compose restarts the app according to its policy. PostgreSQL remains running.

The app publishes only `${HTTP_PORT:-8080}`. PostgreSQL has no host-published port. The internal URL is:

```text
http://SERVER_INTERNAL_IP:8080
```

## Authentication and HTTP/HTTPS

The browser sends login and session requests to the backend API on the same origin. The frontend server also uses `API_INTERNAL_URL=http://127.0.0.1:8080` inside the app container when its protected server layout validates a session. Login and logout set matching `HttpOnly`, `SameSite=Lax`, path, and expiry attributes. The `Secure` attribute follows the actual request scheme: it is off for the current trusted internal HTTP deployment and on for HTTPS.

For TLS terminated by a trusted host reverse proxy, set `HTTP_BIND_ADDRESS=127.0.0.1` and `TRUST_PROXY_HEADERS=true`, and ensure the proxy overwrites `X-Forwarded-Proto`. This keeps direct client access to the app port closed while the proxy supplies the trusted scheme. Do not enable forwarded-header trust while clients can connect directly to port 8080.

Inspect the service count and logs:

```sh
docker compose --env-file deployment/.env -f deployment/docker-compose.yml config --services
docker compose --env-file deployment/.env -f deployment/docker-compose.yml ps
docker compose --env-file deployment/.env -f deployment/docker-compose.yml logs -f
```

The service list is `app` and `db`. `docker compose down` keeps the external PostgreSQL volume; do not use `-v`.

## Backups

Backups are PostgreSQL custom-format dumps stored on the host in `deployment/backups/`, separate from the database volume. The script checks that PostgreSQL is running, writes a new timestamped file without overwriting an existing file, and verifies it with `pg_restore --list` using PostgreSQL 18 tools from the database container.

Create and verify a backup:

```sh
sh deployment/backup.sh
```

Files use names such as `payrollx_2026-11-18_110000.dump`. The backup directory is private to the current user, and backup files are excluded from Git.

Schedule daily backups at 2:00 AM on Ubuntu with the crontab editor:

```sh
crontab -e
```

Add a line using the absolute path to the project checkout:

```cron
0 2 * * * cd /opt/payrollx && /bin/sh deployment/backup.sh >> deployment/backups/cron.log 2>&1
```

The cron user must be able to access Docker and read `deployment/.env`. Keep the project and backup directory on persistent host storage, and copy backups to a separate protected location for disaster recovery.

## Restore

Verify a backup file before restoring:

```sh
docker compose --env-file deployment/.env -f deployment/docker-compose.yml exec -T db pg_restore --list < deployment/backups/payrollx_YYYY-MM-DD_HHMMSS.dump
```

Restore requires an interactive confirmation. It stops the app while PostgreSQL remains online, restores the selected archive transactionally, and starts the app again:

```sh
sh deployment/restore.sh payrollx_YYYY-MM-DD_HHMMSS.dump
```

At the prompt, type `RESTORE` followed by the configured database name. The restore uses the PostgreSQL bootstrap role and retains database ownership and grants from the archive. If restore fails, the app remains stopped and the database logs are left available for review.

## Migration behavior

`database/migrate.sh` remains the migration system. It retains the migration history table, checksum checks, advisory locking, transactional SQL application, and app-role grants. The initial schema file is a schema dump; do not edit it after application. Add future changes as new migration files. Administrator setup uses the existing Argon2 script and does not change an existing administrator.

The previous Compose setup used more services. The production Compose file now includes the same two-service configuration so older commands do not start the obsolete Nginx, frontend, backend, migration, or admin-create containers.
