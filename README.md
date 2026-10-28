# CoolPro / HEVACRAZ

Compliance and field-operations platform for the HVAC-R industry in Zimbabwe, operated by
HEVACRAZ with the National Ozone Unit (NOU). It covers technician field tools (job planning,
gas-usage logging, sizing advice, OCR nameplate scanning), the WhatGas refrigerant catalogue,
an LMS, supplier/vendor workflows, Certificate of Conformity issuance with QR verification,
invites and user administration, and a Gemini-powered voice assistant.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind 4
- PostgreSQL (Neon) with Drizzle ORM
- Signed session-cookie auth (`coolpro_session`), bcrypt passwords, per-route role checks
- SWR client data layer in `lib/api.ts`
- Resend (email), Cloudflare R2 (course materials), DeepSeek (sizing advice), Gemini (voice)

## Roles

`technician`, `contractor`, `trainer`, `lecturer`, `vendor`, `org_admin`, `student`.

Route gating lives in `lib/route-access.ts` (consumed by `middleware.ts`); every API route also
calls `requireRole`. Keep those two layers in agreement when changing access rules.

## Local development

1. Use Node 22 or newer.
2. `npm ci`
3. `cp .env.example .env.local` and fill in `DATABASE_URL` and `SESSION_SECRET`
   (`openssl rand -base64 32`).
4. Apply migrations and optionally seed:
   ```bash
   npm run db:migrate
   npm run db:seed        # requires ALLOW_SEED_TRUNCATE=true
   ```
5. `npm run dev`

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run migrations, then start the production server |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations with drizzle-kit (local development) |
| `npm run db:migrate:prod` | Apply migrations at runtime with drizzle-orm (no dev dependencies) |
| `npm run db:seed` | Seed/reset core tables (requires `ALLOW_SEED_TRUNCATE=true`) |

## Database migrations

`npm run start` automatically runs `scripts/migrate.mjs` first, which applies any pending
migrations from `db/migrations/` using the journal. It requires `DATABASE_URL` and exits
non-zero if the database is unavailable, so a failed migration prevents the app from serving
traffic.

Migrations are idempotent per journal entry. Run a single app instance during deploy, or move
migration execution to a dedicated release step, if you scale to multiple replicas booting at
once. Schema changes should be committed as SQL + a `db/migrations/meta/_journal.json` entry
(`npm run db:generate` does this for you).

## Scheduled jobs and monitoring

Two GitHub Actions workflows keep the platform current:

- `.github/workflows/cron.yml` — WhatGas incremental sync daily, full sync weekly, and
  technician/membership expiry reminders daily. Also supports manual dispatch.
- `.github/workflows/health-check.yml` — hourly `GET /api/health`, which checks the app and
  database.

Configure these in the GitHub repository:

- Repository variable `APP_URL` — the deployed origin, e.g. `https://your-domain.com`
- Repository secret `CRON_SECRET` — must match the app environment's `CRON_SECRET`

The cron endpoints reject requests without `Authorization: Bearer <CRON_SECRET>`.

## Deployment

The app deploys on Railway via Nixpacks; `nixpacks.toml` builds with `npm run build` and starts
with `npm run start` (which applies migrations first). Set the variables listed in
`.env.example` on the service, including `DATABASE_URL`, `SESSION_SECRET`, `CRON_SECRET`,
`RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, and the R2
credentials if course materials are used.

Provider configuration for Vercel (`vercel.json`) is kept, but Railway is the current target.

## Verification

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

## Documentation

- `UNFIXED01.md` — current gaps and operational follow-ups
- `SONNET_ALIGNMENT.md` — architecture and workflow orientation
- `REFACTOR_PLAN.md` — historical audit (2026-07-03); many items have since been fixed
- `DATA_FLOWS.md`, `SITE_BLUEPRINT.md` — historical design notes, not current architecture
