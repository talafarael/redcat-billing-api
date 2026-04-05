# RedCat Billing API

NestJS REST API for user authentication, role-based access control, and single-currency billing (deposits, transfers, cancellations). Transaction events can be forwarded to an optional HTTP webhook.

## Stack

- **Runtime:** Node.js 22+, NestJS 11
- **Database:** PostgreSQL 15
- **ORM:** TypeORM (migrations enabled; `synchronize` is off)
- **Auth:** JWT access + refresh tokens, delivered via HTTP-only cookies
- **Docs:** Swagger (OpenAPI), enabled in **development** only

## Prerequisites

- Node.js 22+ and npm
- PostgreSQL 15 (local install or Docker)
- Docker and Docker Compose (optional, for containerized workflows)

## Environment variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | HTTP port (default `7000`) |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Secrets used to sign JWTs |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Token TTLs (e.g. `15m`, `7d`) |
| `WEBHOOK_URL` | Optional. If set, transaction payloads are POSTed here |

Copy the appropriate example file and adjust values:

- **Local / dev:** `.env.dev.example` → `.env` (or reuse your existing `.env`)
- **Production compose:** `.env.prod.example` → `.env.prod`

Never commit real secrets.

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

Using Docker (database only):

```bash
docker compose -f docker-compose.db.yml --env-file .env up -d
```

Ensure `DB_*` in your `.env` match the compose file (see `.env.db.example` if present).

### 3. Run migrations

Migrations run automatically when the application boots (see `DatabaseModule`). You can also run them manually:

```bash
npm run migration:run
```

### 4. (Optional) Seed demo data

Seeds create a default admin user and sample clients (see `database/seeds/user.seed.ts`):

```bash
npm run seed:run
```

### 5. Start the API

```bash
npm run start:dev
```

The API listens at `http://localhost:<PORT>/api` (default port `7000`).

### Swagger

When `NODE_ENV=development`, Swagger UI is served at:

`http://localhost:<PORT>/api`

Cookie-based auth is documented there (`access_token`). Use a browser or a client that stores cookies after `POST /api/auth/login` or `POST /api/auth/register`.

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run compiled app (`node dist/src/main.js`) |
| `npm run migration:run` / `migration:revert` / `migration:show` | TypeORM CLI |
| `npm run seed:run` | Run database seeders |
| `npm run test` / `test:e2e` / `test:cov` | Tests |

## Docker: development (app + Postgres)

Uses `Dockerfile.dev`, hot reload, and bind-mounts the project.

```bash
docker compose -f docker-compose.yml.dev --env-file .env up -d --build
```

Run seeds inside the app container:

```bash
docker compose -f docker-compose.yml.dev --env-file .env exec app npm run seed:run
```

See `package.json` for `docker:dev:*` helper scripts.

## Docker: production

Multi-stage image: `Dockerfile`. Compose file: `docker-compose.prod.yml`.

1. Copy `.env.prod.example` to `.env.prod` and set strong `DB_PASSWORD`, `JWT_*` secrets, and optional `WEBHOOK_URL`.
2. Build and start:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Or use npm helpers (same compose file and `.env.prod`):

| Command | |
|--------|---|
| `npm run docker:prod:up` | Build and start in the background |
| `npm run docker:prod:down` | Stop containers |
| `npm run docker:prod:down:clean` | Stop and remove volumes |
| `npm run docker:prod:logs` / `docker:prod:logs:app` | Follow logs |
| `npm run docker:prod:build` | Build images |
| `npm run docker:prod:restart` | Restart the app service |
| `npm run docker:prod:shell` | Shell inside the app container |
| `npm run docker:prod:seed` | Run database seeds in the app container |
| `npm run docker:prod:migration:run` / `docker:prod:migration:show` | Migrations |

The API is exposed on host port `PORT` from `.env.prod` (default `7000` mapped to container `7000`).

**Swagger in production:** Swagger UI is **disabled** when `NODE_ENV=production`. To browse OpenAPI during development, run locally or with `NODE_ENV=development`.

## API overview

Global prefix: **`/api`**.

| Area | Highlights |
|------|------------|
| **Auth** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh` |
| **Users** | `GET /api/users/me`, `PATCH /api/users/me/deactivate`, admin: list/block users |
| **Transactions** | Deposits, transfers, list (paginated), cancel; admin can list/cancel any transaction |

JWT cookies: `access_token`, `refresh_token` (see `src/common/config/cookies.ts`).

## Roles

- **Admin:** Manage users (read, block), read/cancel any transaction.
- **Client:** Default role on registration. Own profile, deposits, transfers, own transaction list/cancel, self-deactivation.

Roles are modeled as an enum on the user entity; there is no separate `roles` table.

## Webhook

If `WEBHOOK_URL` is configured, the service sends JSON payloads for transaction-related events (see `src/common/modules/webhook` and transaction webhook integration).

## License

UNLICENSED (private project).
