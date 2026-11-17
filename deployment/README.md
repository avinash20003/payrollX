# Deployment

## Required environment

If `deployment/.env` does not exist, create it from the example:

```sh
cp deployment/.env.example deployment/.env
```

Set unique `POSTGRES_PASSWORD`, `MIGRATOR_DB_PASSWORD`, and URL-safe `APP_DB_PASSWORD` values, plus `ADMIN_USERNAME` and `ADMIN_PASSWORD` (at least 12 characters). PostgreSQL's bootstrap account is used only by the migration job; the backend and admin bootstrap use the limited app account. The admin password is used only when no administrator exists; later deploys skip admin creation and do not rotate its password. Store `.env` in the deployment secret manager and never commit it.

## Startup and deployment order

Use the deployment script as the single entrypoint:

```sh
sh deployment/deploy.sh local
```

It builds (or pulls) the application images, stops the current request path, removes old one-shot migration/bootstrap containers, and then runs Compose. This causes brief deployment downtime while migrations run. Health and completion dependencies enforce this order:

1. PostgreSQL becomes healthy.
2. Versioned SQL migrations run and their checksums are recorded.
3. An administrator is created if one does not already exist.
4. The backend becomes healthy.
5. The frontend becomes healthy.
6. Nginx starts and publishes the site at `http://localhost:8080` (change with `HTTP_PORT`).

For a release using published images, set `FRONTEND_IMAGE`, `BACKEND_IMAGE`, and `NGINX_IMAGE` in the deployment environment to published, immutable version tags (or digests), then run:

```sh
sh deployment/deploy.sh production
```

The production mode pulls images and uses `docker-compose.prod.yml`; build and publish those images through your CI pipeline first.

Inspect logs or stop services with:

```sh
docker compose --env-file deployment/.env -f deployment/docker-compose.yml logs -f
docker compose --env-file deployment/.env -f deployment/docker-compose.yml down
```

`down` retains the PostgreSQL volume. Permanently deleting the volume removes database contents.

## Database migration and backup

`database/migrations/001_initial_schema.sql` is the supplied PostgreSQL 18 schema dump. The migration runner is safe to rerun and fails if an applied migration's checksum changes. Add new changes as new migration files. Do not apply the initial schema over an existing populated database; establish a reviewed baseline or migrate/restore the existing database first. PostgreSQL major-version upgrades require a database upgrade plan.

Back up and restore with:

```sh
docker compose --env-file deployment/.env -f deployment/docker-compose.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
docker compose --env-file deployment/.env -f deployment/docker-compose.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < backup.sql
```

Terminate HTTPS at a production load balancer or configure Nginx with the deployment's TLS certificates before exposing the service publicly.
