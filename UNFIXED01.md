# UNFIXED01 — Known Gaps and Unfinished Work

_Updated 2026-10-28. This is a punch list of what is deliberately incomplete, not a wishlist._

## Product/workflow gaps

- **NOU and HEVACRAZ approvals share one role.** Both supplier-reorder stages
  (`/api/supplier-reorders/[id]/hevacraz-approve` and `.../nou-approve`) require only
  `org_admin`, and the schema has no NOU-specific role. One admin can approve both stages.
  Fixing this needs a product decision: a new role, a sub-permission, or per-user flags.
- **Exams are incomplete end-to-end.** The certifications page's "Start Exam" is a local
  simulation, and there is no student exam-submission UI, so the trainer gradebook stays empty.
  Either build the submission flow or hide both halves until it exists.
- **FieldToolkit installations are localStorage-only.** Check `lib/platformStore.ts`; there is
  still no installations table or API route for that flow.
- **Image annotations store full base64 images in localStorage.** This risks quota exhaustion
  and silent loss when the device cache is cleared. Moving them to R2 is the eventual fix.
- **Vendor ledger attestations are self-reported.** "Reported to NOU" and "shared with client"
  have no counter-signature.

## Not built or not exercised

- **Gemini Live API (Phase 2 voice) not started.** The voice assistant uses a Gemini text
  round-trip (browser STT → Gemini → browser TTS). Realtime/interruptible audio was deferred
  on cost and patchy-connectivity grounds.
- **R2 course-material uploads have never been exercised end-to-end.** Code and credentials
  are in place, but no real upload has been verified against the bucket.
- **No end-to-end or browser test suite.** Vitest covers pure logic and API validation
  (`npm test`); there are no Playwright/Cypress tests and no automated UI checks.
- **Rate limiting is in-memory.** It assumes a single app instance; multi-replica deploys need
  a shared store such as Redis.
- **No APM/error tracking.** Uptime is checked hourly through `/api/health`, but there is no
  Sentry-style exception tracking or latency metrics.

## Never verified in a browser

Every recent change was confirmed with typecheck, lint, unit tests, build, and compiled-output
inspection. A manual click-through is still worth doing for:

- Invite flow: `/admin/invites` → email/copied link → `/accept-invite` → login
- `/admin/users` role and status editing
- COC request flow: `/jobs/request-coc` → `/admin/coc-requests` → approve → PDF/QR →
  `/verify-coc`
- Course material upload/download against the real R2 bucket
- The Gemini voice assistant answering a refrigerant-safety question
- The CSP and protective headers across the main dashboards (check the browser console)
- Deployed migration startup (`npm run start`) against a staging database

## Confirmed fine, not gaps

- `ENABLE_DEMO_LOGIN` quick login and the dashboard demo banner are correctly gated (disabled
  in production; the banner only appears for rows explicitly flagged `isDemo`).
- Payments are intentionally absent. No checkout, gateway, or payment fields are wired.
- No hardcoded/mock data remains in production paths that was found in the last sweep.

## Operational dependencies (action needed outside the code)

- **Resend**: domain verification is done, but a real invite send-and-receive has not been
  confirmed.
- **Cloudflare R2**: credentials are set on Railway; the bucket has not been exercised.
- **Gemini**: `GEMINI_API_KEY` is set; the voice assistant is live.
- **DeepSeek**: set `DEEPSEEK_API_KEY`; without it, sizing advice returns a graceful
  "unavailable" message.
- **Scheduled jobs**: set the GitHub `APP_URL` repository variable and `CRON_SECRET` secret (see
  `.github/workflows/cron.yml`). Without them the scheduled workflows fail loudly.
