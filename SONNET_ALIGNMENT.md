# SONNET_ALIGNMENT — Ground-Truth Orientation for This Repo

_Updated 2026-10-28 from the current code. Purpose: give a new agent an accurate mental model of
the app, its dashboards, data flows, and the status of unfinished work._

---

## 1. What this app is

**CoolPro / HEVACRAZ** — a compliance and field-operations platform for the HVAC-R industry in
Zimbabwe, operated by HEVACRAZ with the National Ozone Unit (NOU). It covers technician field
tools (job planning, gas-usage logging, sizing advice, OCR nameplate scanning), a refrigerant
catalogue synced from the external WhatGas API, an LMS, supplier/vendor workflows, Certificate
of Conformity issuance with QR verification, invites/user administration, and a Gemini-powered
voice assistant.

## 2. Actual tech stack

| Layer | Reality |
|---|---|
| Framework | Next.js **16.4.3** App Router, React 19, TypeScript, Tailwind 4 |
| Database | PostgreSQL/Neon via **Drizzle ORM** (`db/client.ts`, 26 schema modules in `db/schema/`) |
| Auth | Signed `coolpro_session` cookie (`lib/server/auth.ts`, edge parsing in `lib/server/auth-edge.ts`), bcrypt passwords, sliding 15-minute sessions |
| Access control | `lib/route-access.ts` (longest-prefix role rules) used by `middleware.ts`, plus `requireRole` in every API route; `Sidebar.tsx` filters navigation |
| Client data | **SWR hooks in `lib/api.ts`** — the single client data layer |
| Files | Cloudflare **R2** presigned URLs (`lib/server/r2.ts`) |
| Email | **Resend** (`lib/server/email.ts`) |
| AI | Gemini 2.5 Flash text round-trip for voice (`/api/voice-assistant`); DeepSeek for sizing advice (`/api/sizing-advice`) |
| External sync | WhatGas catalogue (`lib/whatgas/*`); scheduled daily/weekly via `.github/workflows/cron.yml`, manual "Sync now" in `/admin/refrigerants` |
| Migrations | `db/migrations/*.sql` + journal; applied automatically by `scripts/migrate.mjs` before `npm run start` |
| Monitoring | `/api/health` (app + database), probed hourly by `.github/workflows/health-check.yml` |
| Deploy | Railway/Nixpacks (primary); `vercel.json` is retained |
| Tests | Vitest unit tests (`npm test`); no browser/e2e suite |

## 3. Which docs to trust

| File | Status |
|---|---|
| **`README.md`** | ✅ Setup, scripts, migrations, cron, deployment. Start here. |
| **`UNFIXED01.md`** | ✅ Current punch list (NOU/HEVACRAZ split, exams, installations, R2 verification, browser checks). |
| **`REFACTOR_PLAN.md`** | ⚠️ Historical audit dated 2026-07-03. Many items are fixed; treat unresolved items as candidates, not facts. |
| `DATA_FLOWS.md`, `SITE_BLUEPRINT.md` | ❌ Historical design notes from the pre-database era. Not current architecture. |
| `SYSTEMS_CAPABILITIES.md`, `WHATGAS_INTEGRATION_UPDATE.md`, `README_REGISTRY.md` | Informational; spot-check before relying. |

## 4. Roles and dashboards

Seven roles from the DB enum (`db/schema/users.ts`, mirrored in `lib/roles.ts`):
`technician`, `contractor`, `trainer`, `lecturer`, `vendor`, `org_admin`, `student`.

Navigation lives in `components/layout/Sidebar.tsx`. Route access lives in `lib/route-access.ts`
and is unit-tested (`lib/route-access.test.ts`). The rule matcher uses the **longest matching
prefix**, so a narrower rule can never be masked by a broader one.

| Surface | Route | Who | Data source |
|---|---|---|---|
| Main dashboard | `/dashboard` | everyone (branches on role) | SWR: `usePlannerJobs`, `useGasLogs`, `useCocRequests`, supplier/reorder hooks |
| Admin hub | `/admin` | org_admin | quick links + KPIs |
| NOU Dashboard | `/nou-dashboard` | org_admin | supplier reorders (NOU stage), course approvals |
| Reporting | `/admin/reporting` | org_admin | client-side aggregation of several hooks |
| Refrigerant Analytics | `/admin/refrigerant-analytics` | org_admin | gas logs + planner jobs (`lib/whatgas/analytics.ts`) |
| Jobs & Logs | `/jobs` | technician, contractor, org_admin | `usePlannerJobs`, `useGasLogs` |
| LMS | `/learn`, `/learn/manage` | trainer, lecturer | `useCourses`, `useExamSubmissions` |
| Vendor panels | `/suppliers`, `/suppliers/reorder`, `/supplier-compliance` | vendor | ledger, reorders, compliance applications |
| Safety Center | `/safety-center` | all authenticated roles | `components/SafetyCenter.tsx` |

## 5. Data model (26 schema modules)

- **Identity/access**: `users`, `invites`, `password_reset_tokens`, `technicians`, `technician_verifications`, `contractors`
- **Applications**: `student_applications`, `technician_applications`, `supplier_applications`, `supplier_compliance_applications`, `registration_applications`
- **Field ops**: `planner_jobs`, `gas_usage_logs`, `equipment_records`, `ocr_scans`, `coc_requests`, `installations`, `field_images`, `training_sessions`
- **LMS**: `courses`, `exam_submissions`, `trainer_certificate_requests`
- **Refrigerants**: `refrigerants`, `whatgas_sync_logs`
- **Supplier ops**: `supplier_ledger`, `supplier_reorders` (two-stage: `pending_hevacraz` → `pending_nou` → approved)
- **Other**: `memberships`, `rewards`, `notifications`, `audit_log`, `email_log`, `accidents`

The cylinder, trade-permit, reclamation, and recycling tables are no longer part of the Drizzle
schema or application; their historical tables may still exist in deployed databases.

## 6. Canonical data flow

UI page/component → SWR hook or mutation in `lib/api.ts` → `/api/*` route (`requireRole` first) →
Drizzle → PostgreSQL. Mutations call SWR `mutate()` to revalidate. Public verification pages
(`/verify-coc`, `/verify-technician`) use unauthenticated `/api/public/*` routes.

**localStorage is used only for:** FieldToolkit installations and checklists (offline-first,
no DB table yet), `ImageAnnotationWorkbench` base64 image records, and UI preferences. Do not
add new localStorage-backed features.

## 7. Approval/workflow map

| Flow | Submit | Review | Endpoints |
|---|---|---|---|
| Student / technician / supplier applications | public or self-serve forms | org_admin | `/api/*-applications/[id]/(approve\|reject)` |
| Course publishing | trainer/lecturer submit (draft → pending_nou) | org_admin at `/learn/approvals` | `/api/courses/[id]/(approve\|reject)` |
| CoC requests | technician (`/jobs/request-coc`, requires completed job) | org_admin at `/admin/coc-requests` → PDF + QR → `/verify-coc` | `/api/coc-requests/[id]/…` |
| Certificate requests | trainer | org_admin approve → issue | `/api/certificate-requests/[id]/…` |
| Supplier reorders | vendor | two-stage: HEVACRAZ approve, then NOU approve | `/api/supplier-reorders/[id]/(hevacraz\|nou)-(approve\|reject)` |
| Exam grading | no student submission UI yet | trainer gradebook | `/api/exam-submissions/[id]/grade` |

**Known authority gap:** both reorder stages require only `org_admin`; no NOU-specific role
exists. See `UNFIXED01.md`.

## 8. Current status

Fixed and verified: dashboard/jobs use live SWR data; job completion PATCH exists; FieldToolkit
demo logs removed; course management is in the sidebar; `/learn` branches on trainer/lecturer;
refrigerant analytics is wired; supplier quota is computed; `.env.example` covers Resend/site
URL; payments have been removed; Groq was replaced with DeepSeek; production dependency audit
passes; migrations run at startup; cron and health workflows exist; `/safety-center` is protected
and route rules are tested; CSP and security headers are set.

Still open: NOU/HEVACRAZ authority split, student exam submission flow, FieldToolkit
installations migration, image annotations off localStorage, R2 end-to-end verification,
Gemini Live Phase 2, and browser verification of the flows listed in `UNFIXED01.md`.

## 9. Conventions

1. **Never add a new localStorage-backed feature.** New data = Drizzle table + `/api` route with
   `requireRole` first + SWR hook/mutation in `lib/api.ts` + page consuming the hook.
2. **RBAC changes touch three places**: `lib/route-access.ts`, `Sidebar.tsx` `roles` arrays, and
   the API route's `requireRole`.
3. **Roles come from the DB enum** (`db/schema/users.ts` → `lib/roles.ts`).
4. **Statuses are explicit state machines** in PATCH routes (see planner jobs).
5. **Schema changes need a migration**: `npm run db:generate`, review the SQL, commit it with
   the journal entry. Startup applies it via `scripts/migrate.mjs`.
6. Env vars live on Railway; `.env.example` is the authoritative list. `CRON_SECRET` guards the
   cron routes; GitHub Actions needs `APP_URL` + `CRON_SECRET`.

## 10. Sensible next-work order

1. Browser-verify the `UNFIXED01.md` checklist against staging, including CSP and migrations.
2. Decide and implement the NOU/HEVACRAZ authority split.
3. Build the student exam-submission flow, or hide both dead halves.
4. Migrate FieldToolkit installations and image annotations to the DB/R2.
5. Exercise R2 uploads end-to-end and confirm Resend delivery with a real invite.
