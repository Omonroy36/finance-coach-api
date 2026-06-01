# Deployment Readiness Review

**Target:** Google Cloud Run (API + Worker) · Neon PostgreSQL · Upstash Redis · GitHub Actions CI/CD · Artifact Registry
**Date:** 2026-06-01
**Status:** Build-ready. Two action items remain before first production deploy (see _Remaining Risks_).

---

## 1. Changes Made

### Docker build (multi-stage, builds inside the image)

- **Removed** the old single `Dockerfile` (Alpine; copied a **pre-built `dist/`** from the host).
- **Added `Dockerfile.api`** and **`Dockerfile.worker`** — both are 3-stage `node:20-slim` builds:
  1. **builder** — `npm ci` (full deps) → `npx prisma generate` → `npm run build` (compiles TS inside the image; no host `dist/` needed).
  2. **deps** — `npm ci --omit=dev` → `npx prisma generate` (a clean production-only `node_modules` with the Prisma Client built against the runtime image's OpenSSL).
  3. **runtime** — copies only `package.json`, prod `node_modules`, `dist/`, and `prisma/`; runs as the unprivileged `node` user.
- `openssl` + `ca-certificates` are installed in every stage so the **Prisma query engine works** on Debian slim.
- **Added `.dockerignore`** to shrink the build context and keep `.env`/keys/`dist`/`node_modules` out of the image.

### Cloud Run compatibility

- Verified the API already reads `PORT` from the environment and binds `0.0.0.0`:
  - [`src/config/index.ts`](src/config/index.ts) coerces `process.env.PORT` (default `3000`) and `HOST` (default `0.0.0.0`).
  - [`src/main.ts`](src/main.ts) listens on `config.PORT` / `config.HOST`; `trustProxy: true` is set for Cloud Run's proxy.
  - **No code change required** — Cloud Run injects `PORT` (usually `8080`) and it is honored automatically.

### Prisma migrations

- `db:migrate` (`prisma migrate dev`) and `db:migrate:deploy` (`prisma migrate deploy`) scripts already existed and are kept.
- **Added [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md)** documenting the `migrate dev` vs `migrate deploy` difference, why migrations are **not** run on app startup, and the planned CI/CD `migrate` job.
- Migrations are **not** auto-run on boot (deliberate — avoids N-instance races and limits blast radius).

### Environment validation

- Verified a **zod validator already exists** ([`src/config/index.ts`](src/config/index.ts)) covering `DATABASE_URL`, `REDIS_URL`, `NODE_ENV`, `PORT`, JWT keys, encryption key, etc. It **fails fast** via `process.exit(1)` when required vars are missing/invalid.
- **No `JWT_SECRET` introduced:** this app authenticates with an **RSA keypair** (`JWT_PRIVATE_KEY_BASE64` / `JWT_PUBLIC_KEY_BASE64`), not a shared secret. Adding `JWT_SECRET` would be dead config.

### docker-compose (local dev only)

- Annotated every service (`postgres`, `redis`, `api`, `worker`) and clarified the file is **local-development only** (prod uses Neon/Upstash/Cloud Run).
- `api` now builds from `Dockerfile.api`; `worker` from `Dockerfile.worker`.

### Worker

- Confirmed the worker ([`src/workers/worker.main.ts`](src/workers/worker.main.ts)) runs **independently** of the API and **does not** start Fastify.
- **Hardened graceful shutdown:** added a re-entrancy guard and now closes workers → queues → Prisma → Redis in order (previously Redis/queues were left open). Same guard added to the API's shutdown in [`src/main.ts`](src/main.ts).

### Health check

- Verified `GET /health` exists; **trimmed** it to the exact spec `{ "status": "ok" }`, kept `logLevel: 'silent'`, and confirmed it touches **no** DB/Redis — safe and fast for Cloud Run probes.

### Logging

- Dev: `pino-pretty` (human-readable). Production: structured single-line JSON to stdout (Cloud Run captures stdout automatically).
- **Added GCP mapping** in production: pino numeric levels → Cloud Logging `severity` (`INFO`/`WARNING`/`ERROR`/`CRITICAL`) and `messageKey: 'message'`, so log levels render and filter correctly in Cloud Logging.

### Build-blocking bug fixes (discovered during this review)

The production image runs `npm run build`; the repo **did not compile**. Fixed:

1. **JWT claims silently dropped (functional/security bug).** `@fastify/jwt` v10 uses the `fast-jwt` engine, whose option names differ from `jsonwebtoken`. The code used `issuer`/`audience`, which `fast-jwt` ignores — tokens were issued and verified **without `iss`/`aud` claims**. Corrected to `iss`/`aud` (sign) and `allowedIss`/`allowedAud` (verify) in [`src/plugins/auth.plugin.ts`](src/plugins/auth.plugin.ts).
2. **JWT sign payload type.** [`src/shared/types/fastify.d.ts`](src/shared/types/fastify.d.ts) required `iat`/`exp` on the sign payload (they're auto-generated). Moved them to the verified-`user` type.
3. **Stale `@ts-expect-error`** removed in [`src/plugins/request-id.plugin.ts`](src/plugins/request-id.plugin.ts) (replaced with a typed cast).

> `tsc -p tsconfig.build.json` and `npm run build` now exit `0`; `dist/main.js` and `dist/workers/worker.main.js` are produced.

---

## 2. Remaining Risks

| # | Risk | Severity | Action |
|---|------|----------|--------|
| 1 | **`prisma/migrations/` was git-ignored.** Un-ignored in `.gitignore`, but the existing `20260422041648_init` migration is **not yet committed**. Until it is, `migrate deploy` has nothing to apply. | 🔴 High | `git add prisma/migrations && git commit` before the first deploy. |
| 2 | **JWT `iss`/`aud` behavior change.** Tokens now actually carry and enforce `iss`/`aud`. Any tokens minted before this fix will fail verification. | 🟠 Medium | Safe pre-production (15-min access tokens). If already issuing tokens, plan a key/clients refresh. |
| 3 | **Secrets management not wired.** `.env` is fine locally, but Cloud Run should pull secrets (DB URL, JWT keys, encryption key, Plaid, Firebase) from **Secret Manager**, not env files. | 🟠 Medium | Create secrets + reference them in the Cloud Run service definition. |
| 4 | **Health check is liveness-only.** It does not verify DB/Redis (intentional). Add a separate `/ready` if you want readiness gating. | 🟡 Low | Optional. |
| 5 | **Worker has no HTTP port.** If deployed as a Cloud Run *service* it needs a port to pass startup checks; a background worker fits **Cloud Run Jobs** or a min-instance service with a tiny health server better. | 🟠 Medium | Decide Worker deployment shape (see architecture note). |
| 6 | **Cron scheduling lives in the worker.** Repeatable BullMQ jobs are registered on worker boot; with `min-instances=0` they may not register until first traffic. | 🟡 Low | Keep worker `min-instances >= 1`, or move cron to Cloud Scheduler. |
| 7 | **Pre-existing `tsconfig.json` typecheck error** (`prisma/seed.ts` outside `rootDir`). Affects `npm run typecheck` only, **not** the build. | 🟡 Low | Exclude `seed.ts` from the base config or give it its own. |
| 8 | **No automated image vulnerability scanning / `npm audit` gate** in CI yet. | 🟡 Low | Add to the GitHub Actions pipeline. |

---

## 3. Recommended GCP Architecture

```
                          ┌───────────────────────────┐
   Internet ─── HTTPS ───▶│  Cloud Run: finance-api    │  (autoscale 0..N)
                          │  Dockerfile.api            │  PORT=8080, 0.0.0.0
                          │  GET /health liveness      │
                          └─────────────┬──────────────┘
                                        │ enqueue jobs
                            ┌───────────┴───────────┐
                            ▼                        ▼
                   ┌──────────────────┐     ┌──────────────────┐
                   │  Upstash Redis   │     │   Neon Postgres  │
                   │  (BullMQ + cache)│     │  (serverless PG) │
                   └────────┬─────────┘     └────────▲─────────┘
                            │ consume jobs            │ SQL
                          ┌─┴───────────────────────┐ │
                          │ Cloud Run: finance-worker│─┘  (min-instances >= 1)
                          │ Dockerfile.worker        │
                          │ BullMQ workers + cron    │
                          └──────────────────────────┘

   Cloud Scheduler ──(optional, replaces in-worker cron)──▶ finance-api / Pub/Sub
   Secret Manager ──(DB URL, JWT keys, encryption key, Plaid/Firebase)──▶ both services
```

### Component mapping

| Concern | Service | Notes |
|---|---|---|
| HTTP API | **Cloud Run** `finance-api` | Built from `Dockerfile.api`. Scales to zero. Reads `PORT` from env. `/health` as the liveness probe. |
| Background jobs | **Cloud Run** `finance-worker` | Built from `Dockerfile.worker`. Keep `min-instances >= 1` so queue consumers + cron stay alive. |
| Database | **Neon PostgreSQL** | Set `DATABASE_URL` to the **pooled** connection string (Cloud Run is high-concurrency). Migrations applied via the CI `migrate` job. |
| Queue / cache | **Upstash Redis** | TLS `rediss://` URL in `REDIS_URL`. Note `maxRetriesPerRequest: null` is already set for BullMQ. |
| Secrets | **Secret Manager** | Mount as env vars on both Cloud Run services. Do **not** ship `.env`. |
| Images | **Artifact Registry** | `REGION-docker.pkg.dev/PROJECT/finance/{api,worker}:GIT_SHA`. |
| CI/CD | **GitHub Actions** | See pipeline below. |

### Suggested CI/CD pipeline (GitHub Actions)

```
push to main
  ├─ test        : npm ci → npm run lint → npm run typecheck → npm test
  ├─ build-push  : docker build -f Dockerfile.api  → push to Artifact Registry
  │                docker build -f Dockerfile.worker → push to Artifact Registry
  ├─ migrate     : npm run db:migrate:deploy   (DATABASE_URL from Secret Manager)   ← gate
  └─ deploy      : gcloud run deploy finance-api    --image ...:SHA
                   gcloud run deploy finance-worker --image ...:SHA   (needs: migrate)
```

Authenticate via **Workload Identity Federation** (no long-lived JSON keys). Tag images with the git SHA for traceable rollbacks.

### Pre-first-deploy checklist

- [ ] Commit `prisma/migrations/` (Risk #1).
- [ ] Create Secret Manager secrets and bind them to both services (Risk #3).
- [ ] Decide Worker shape: min-instance service vs Cloud Run Job (Risk #5/#6).
- [ ] Use Neon's **pooled** `DATABASE_URL` and Upstash `rediss://` URL.
- [ ] Set Cloud Run liveness probe → `GET /health`.
```
