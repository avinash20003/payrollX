import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const globalForPostgres = globalThis as typeof globalThis & {
  postgresPool?: Pool;
};

export const pool =
  globalForPostgres.postgresPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgresPool = pool;
}