# Backend API

This is a separate Next.js API service. API route handlers live in `src/app/api`; they contain the existing validation and SQL behavior, while `src/config` owns environment and database setup. It listens on port 3001 and is not published directly to the host. The frontend and Nginx proxy requests to it.

The service uses PostgreSQL through `pg`. Deployment waits for schema migration and the idempotent administrator bootstrap before starting the API. The bootstrap requires `ADMIN_USERNAME` and `ADMIN_PASSWORD`; it creates an administrator only if none exists and never rotates an existing password.
