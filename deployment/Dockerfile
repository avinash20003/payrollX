FROM node:22-bookworm-slim AS backend-deps
WORKDIR /workspace/backend
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
RUN node -e "if (require('next/package.json').version !== '16.4.6') process.exit(1)"

FROM node:22-bookworm-slim AS frontend-deps
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
RUN node -e "if (require('next/package.json').version !== '16.4.6') process.exit(1)"

FROM node:22-bookworm-slim AS backend-build
WORKDIR /workspace/backend
COPY --from=backend-deps /workspace/backend/node_modules ./node_modules
COPY backend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV FRONTEND_INTERNAL_URL=http://127.0.0.1:3000
RUN npm run build

FROM node:22-bookworm-slim AS frontend-build
WORKDIR /workspace/frontend
COPY --from=frontend-deps /workspace/frontend/node_modules ./node_modules
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_INTERNAL_URL=http://127.0.0.1:8080
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080 \
    FRONTEND_PORT=3000
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg libstdc++6 \
    && install -d /usr/share/keyrings \
    && curl --fail --silent --show-error --location https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-18 \
    && apt-get purge -y --auto-remove curl gnupg \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 payrollx \
    && useradd --system --uid 1001 --gid payrollx --home-dir /app payrollx

COPY --from=backend-build --chown=payrollx:payrollx /workspace/backend/.next/standalone ./backend
COPY --from=backend-build --chown=payrollx:payrollx /workspace/backend/.next/static ./backend/.next/static
COPY --from=frontend-build --chown=payrollx:payrollx /workspace/frontend/.next/standalone ./frontend
COPY --from=frontend-build --chown=payrollx:payrollx /workspace/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-build --chown=payrollx:payrollx /workspace/frontend/public ./frontend/public
COPY --chown=payrollx:payrollx backend/scripts/create-admin.mjs ./backend/scripts/create-admin.mjs
COPY --chown=payrollx:payrollx database/migrate.sh ./database/migrate.sh
COPY --chown=payrollx:payrollx database/migrations /migrations
COPY --chown=payrollx:payrollx deployment/app-start.mjs ./app-start.mjs

USER payrollx
EXPOSE 8080
CMD ["node", "/app/app-start.mjs"]
