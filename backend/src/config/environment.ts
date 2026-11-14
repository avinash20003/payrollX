const required = ["DATABASE_URL"] as const;

for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required by the backend.`);
}

export const environment = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL!,
  nodeEnv: process.env.NODE_ENV ?? "development",
};
