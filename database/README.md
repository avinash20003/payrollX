# Database

PostgreSQL 18 runs in its own container with data stored in a named volume. The first versioned migration creates the application tables. `migrate.sh` uses a migration-owner role for DDL and grants the separate runtime role only table and sequence permissions. It records every applied filename and SHA-256 checksum in `public.schema_migrations`; changing an applied migration makes deployment fail. Add later changes as new ordered SQL files.

`migrations/001_initial_schema.sql` is the supplied schema-only PostgreSQL 18 dump and contains no business records. A fresh deployment applies it after PostgreSQL is healthy, then creates the first administrator. Back up an existing database before moving it here. Do not apply the baseline over an existing schema; existing installations need a reviewed migration baseline before switching deployments.
