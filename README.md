# Housekeeping Salary

The repository is split into independently built services:

- [`frontend/`](frontend/README.md): Next.js user interface.
- [`backend/`](backend/README.md): Next.js API and PostgreSQL access.
- [`database/`](database/README.md): PostgreSQL schema and versioned migrations.
- [`nginx/`](nginx/nginx.conf): public reverse proxy.
- [`deployment/`](deployment/README.md): deployment configuration and startup flow.

Run `sh deployment/deploy.sh local` after setting `deployment/.env`. Startup is gated in order: PostgreSQL health, schema migration, initial administrator, backend health, frontend health, and Nginx. Only Nginx publishes a host port.
