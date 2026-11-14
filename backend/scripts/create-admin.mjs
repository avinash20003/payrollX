import argon2 from "argon2";
import pg from "pg";

const { Pool } = pg;
const required = ["DATABASE_URL", "ADMIN_USERNAME", "ADMIN_PASSWORD"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}

const username = process.env.ADMIN_USERNAME.trim();
const password = process.env.ADMIN_PASSWORD;

if (!/^[a-zA-Z0-9._-]{1,100}$/.test(username)) {
  throw new Error("ADMIN_USERNAME must be 1–100 letters, numbers, dots, underscores, or hyphens.");
}
if (password.length < 12 || password.length > 1024 || !password.trim()) {
  throw new Error("ADMIN_PASSWORD must be between 12 and 1024 nonblank characters.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(732915480123)");
  const existingAdmin = await client.query(
    "SELECT id, username FROM public.users WHERE UPPER(role) = 'ADMIN' ORDER BY id LIMIT 1"
  );

  if (existingAdmin.rows.length > 0) {
    console.log(`Administrator already exists (${existingAdmin.rows[0].username}); no changes made.`);
    await client.query("COMMIT");
  } else {
    const passwordHash = await argon2.hash(password);
    const result = await client.query(
      `INSERT INTO public.users (username, password_hash, role, is_active)
       VALUES ($1, $2, 'ADMIN', TRUE)
       RETURNING id, username, role`,
      [username, passwordHash]
    );
    await client.query("COMMIT");
    console.log(`Administrator created: ${result.rows[0].username} (id ${result.rows[0].id}).`);
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}
