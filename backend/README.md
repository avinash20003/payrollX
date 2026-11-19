# Backend API

The backend is a Next.js application with route handlers under `src/app/api`. It keeps the existing authentication, PostgreSQL access, validation, and business logic. In the combined deployment its server listens internally on port 8080. API routes are served directly; its Next.js fallback rewrite proxies frontend routes to the separate frontend process inside the same app container.

The deployment startup runs the existing `database/migrate.sh` and `scripts/create-admin.mjs` before opening the HTTP services. The app uses `DATABASE_URL` with the Compose database hostname `db`.
