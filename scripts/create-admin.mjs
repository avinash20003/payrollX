import pg from "pg";
import argon2 from "argon2";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import "dotenv/config";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is missing from your .env file.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const rl = createInterface({
  input: stdin,
  output: stdout,
});

try {
  const username = (
    await rl.question("Enter administrator username: ")
  ).trim();

  const password = await rl.question(
    "Enter administrator password (input will be visible): "
  );

  if (!username || username.length > 100) {
    throw new Error("Username must contain 1–100 characters.");
  }

  if (password.length < 12 || password.length > 1024) {
    throw new Error(
      "Password must contain 12–1024 characters."
    );
  }

  const passwordHash = await argon2.hash(password);

  const result = await pool.query(
    `INSERT INTO public.users (username, password_hash, role)
     VALUES ($1, $2, 'ADMIN')
     ON CONFLICT (username) DO NOTHING
     RETURNING id, username, role`,
    [username, passwordHash]
  );

  if (result.rowCount === 0) {
    throw new Error(
      "That username already exists. No account was changed."
    );
  }

  console.log("\nAdministrator created successfully!");
  console.log("ID:", result.rows[0].id);
  console.log("Username:", result.rows[0].username);
  console.log("Role:", result.rows[0].role);
} catch (error) {
  console.error("\nAdministrator creation failed:", error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await pool.end();
}