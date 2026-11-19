# Frontend

This is the Next.js user interface. It does not connect to PostgreSQL. In the combined Docker deployment, its internal API rewrite points to the backend server at `http://127.0.0.1:8080`, and the backend server proxies non-API requests to the frontend at `http://127.0.0.1:3000`. The browser uses one origin and the existing `/api/*` URL structure.

```sh
npm ci
npm run dev
```
