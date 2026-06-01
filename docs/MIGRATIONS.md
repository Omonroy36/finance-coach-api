# Database Migrations

This project uses **Prisma Migrate**. There are two distinct workflows — using the
wrong one in the wrong environment is a common production incident, so read this.

## `prisma migrate dev` — LOCAL DEVELOPMENT ONLY

```bash
npm run db:migrate          # -> prisma migrate dev
```

- **Interactive.** Compares your `schema.prisma` to the database, prompts you for a
  migration name, and **creates a new migration file** under `prisma/migrations/`.
- Applies the migration to your local dev database.
- May **reset / drop data** if it detects drift or a failed migration.
- Regenerates the Prisma Client.

> ⚠️ **Never run `migrate dev` against a production database.** It can be
> destructive and it is interactive (it will hang in CI waiting for input).

## `prisma migrate deploy` — PRODUCTION / CI-CD

```bash
npm run db:migrate:deploy   # -> prisma migrate deploy
```

- **Non-interactive and non-destructive.**
- Does **not** create new migrations and does **not** prompt.
- Applies every **already-committed, not-yet-applied** migration in
  `prisma/migrations/`, in order. If there is nothing new, it is a no-op.
- Safe to run repeatedly (idempotent).

This is the command that runs in CI/CD — see below.

## Why migrations are NOT run on every app startup

We deliberately do **not** call `migrate deploy` when the API/worker boots:

1. **Concurrency.** Cloud Run scales to N instances. If all of them ran migrations
   on boot you'd get racing/locking against the DB.
2. **Blast radius.** A bad migration would take down every instance at once instead
   of failing a single, observable deploy step.
3. **Separation of concerns.** Schema changes are a deploy-time decision, not a
   runtime one.

Instead, migrations are a **dedicated, gated step in the deploy pipeline**.

## Where `db:migrate:deploy` will be used in CI/CD

In the GitHub Actions deploy workflow, after building images but **before** routing
traffic to the new revision:

```yaml
# .github/workflows/deploy.yml (planned)
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run db:migrate:deploy      # applies committed migrations to Neon
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  deploy-api:
    needs: migrate                          # only deploy after migrations succeed
    # ... build + push to Artifact Registry, then `gcloud run deploy`
```

> The `migrate` job runs once per deploy (not once per instance) and must succeed
> before the new Cloud Run revisions go live.

## Important: migrations must be committed

`prisma/migrations/` **must** be tracked in git. `migrate deploy` replays the
committed files — if they are git-ignored, production has nothing to apply. (This
was previously mis-configured in `.gitignore` and has been fixed.)
