# PAYROLLX Salary

PAYROLLX runs as two Docker services:

- `app`: combined Next.js frontend, backend API, backend-integrated frontend proxy, migrations, and administrator initialization.
- `db`: PostgreSQL 18 Alpine with persistent host-independent Docker volume storage.

Configure `deployment/.env` from `deployment/.env.example`, choose the existing database volume with `POSTGRES_VOLUME_NAME`, then run:

```sh
sh deployment/deploy.sh
```

The app is available at `http://SERVER_INTERNAL_IP:8080` by default. PostgreSQL is internal to the Docker network. See [deployment/README.md](deployment/README.md) for volume safety, backups, restore, and cron instructions.
