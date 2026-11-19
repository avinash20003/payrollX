import { spawn } from "node:child_process";

const pgHost = process.env.PGHOST ?? "db";
const pgPort = process.env.PGPORT ?? "5432";
const pgDatabase = process.env.PGDATABASE;
const pgUser = process.env.PGUSER;
const waitAttempts = Number(process.env.DB_WAIT_ATTEMPTS ?? 60);
const children = new Set();
let stopping = false;

function log(message) {
  console.log(`[startup] ${message}`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });
    children.add(child);

    child.once("error", (error) => {
      children.delete(child);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      children.delete(child);
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${signal ?? `code ${code}`}`));
    });
  });
}

async function waitForDatabase() {
  if (!pgDatabase || !pgUser || !process.env.PGPASSWORD) {
    throw new Error("PostgreSQL migration environment is incomplete.");
  }

  log(`Waiting for PostgreSQL at ${pgHost}:${pgPort}/${pgDatabase}.`);
  for (let attempt = 1; attempt <= waitAttempts; attempt += 1) {
    if (stopping) throw new Error("Startup interrupted during shutdown.");

    try {
      await run("pg_isready", [
        "-h", pgHost,
        "-p", pgPort,
        "-U", pgUser,
        "-d", pgDatabase,
      ], { stdio: "ignore" });
      log("PostgreSQL is accepting connections.");
      return;
    } catch {
      if (attempt === waitAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new Error(`PostgreSQL did not become ready after ${waitAttempts} attempts.`);
}

function stopChildren(signal = "SIGTERM") {
  for (const child of children) child.kill(signal);
}

function watchProcess(name, child) {
  return new Promise((resolve) => {
    child.once("error", (error) => {
      children.delete(child);
      resolve({ name, error });
    });
    child.once("exit", (code, signal) => {
      children.delete(child);
      resolve({ name, code, signal });
    });
  });
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  log(`Received ${signal}; stopping child processes.`);
  stopChildren(signal);

  const forceKill = setTimeout(() => stopChildren("SIGKILL"), 10_000);
  forceKill.unref();
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (children.size === 0) {
        clearInterval(check);
        clearTimeout(forceKill);
        resolve();
      }
    }, 100);
  });
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await waitForDatabase();

  log("Running database migrations.");
  await run("sh", ["/app/database/migrate.sh"]);

  log("Checking administrator initialization.");
  await run("node", ["/app/backend/scripts/create-admin.mjs"]);

  log("Starting backend API and frontend processes.");
  const applicationEnvironment = { ...process.env };
  for (const secretName of [
    "PGPASSWORD",
    "APP_DB_PASSWORD",
    "BOOTSTRAP_PGPASSWORD",
    "ADMIN_PASSWORD",
  ]) {
    delete applicationEnvironment[secretName];
  }
  const frontendEnvironment = { ...applicationEnvironment };
  delete frontendEnvironment.DATABASE_URL;
  frontendEnvironment.API_INTERNAL_URL ??= "http://127.0.0.1:8080";
  const backend = spawn("node", ["server.js"], {
    cwd: "/app/backend",
    env: { ...applicationEnvironment, PORT: "8080", HOSTNAME: "0.0.0.0" },
    stdio: "inherit",
  });
  const frontend = spawn("node", ["server.js"], {
    cwd: "/app/frontend",
    env: { ...frontendEnvironment, PORT: process.env.FRONTEND_PORT ?? "3000", HOSTNAME: "127.0.0.1" },
    stdio: "inherit",
  });
  children.add(backend);
  children.add(frontend);
  log("Both application processes are running.");
  const unexpectedExit = await Promise.race([
    watchProcess("backend", backend),
    watchProcess("frontend", frontend),
  ]);
  if (!stopping) {
    const detail = unexpectedExit.error?.message ?? unexpectedExit.signal ?? `code ${unexpectedExit.code}`;
    console.error(`[startup] ${unexpectedExit.name} exited (${detail}); stopping the other application process.`);
    stopChildren();
    const forceKill = setTimeout(() => stopChildren("SIGKILL"), 10_000);
    forceKill.unref();
    while (children.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    clearTimeout(forceKill);
    process.exitCode = unexpectedExit.code && unexpectedExit.code !== 0 ? unexpectedExit.code : 1;
  }
} catch (error) {
  if (!stopping) {
    console.error("[startup] Application startup failed:", error instanceof Error ? error.message : error);
    stopChildren();
    process.exitCode = 1;
  }
}
