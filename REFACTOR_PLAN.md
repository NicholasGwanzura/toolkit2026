# REFACTOR_PLAN — Whole-App Audit

> **Historical audit (2026-07-03).** Many findings below have since been fixed — including the
> live-data dashboard/jobs migration, job completion, course navigation, analytics wiring,
> middleware ordering, startup migrations, scheduled cron, automated tests, and route hardening.
> Payments were subsequently removed and Groq was replaced with DeepSeek. Treat this file as an
> archaeological record, not a current task list; `UNFIXED01.md` is the live punch list.

_Compiled 2026-07-03 from six parallel audits: technician dashboard/field tools, vendor/supplier
workflows, trainer/lecturer LMS, org admin (all `/admin/*` + NOU dashboard + reporting),
refrigerant/compliance modules, and cross-cutting data-flow/auth architecture. Every finding below
is anchored to real file:line evidence, not speculation. Deduplicated where multiple agents
independently found the same root cause (noted inline — those are the highest-confidence items)._

---

## Tier 1 — Critical: broken core workflows, data users can't see

1. **Job Planner writes to the real DB; Dashboard, Jobs page, and the admin Jobs overview all still read from a dead localStorage key.** *(Found independently by both the technician-dashboard audit and the architecture audit — highest-confidence finding in this whole report.)* `components/JobPlanner.tsx` and `components/FieldScheduling.tsx` POST to `/api/planner-jobs` (real, DB-backed). But `app/(app)/jobs/page.tsx` and `app/(app)/dashboard/page.tsx` still call `readCollection(STORAGE_KEYS.plannerJobs, ...)` — a key nothing writes to anymore. **A technician who schedules a job will never see it on their own dashboard or jobs list.** Fix: swap both files to `usePlannerJobs()` from `lib/api.ts`.
2. **Technician dashboard KPIs are 100% hardcoded.** `dashboard/page.tsx` (`technicianStats`) shows "3/12/48 Jobs Completed", "2 Pending COCs", "450 Rewards Points", "5 Certifications" — literal constants, never computed from any data source, sitting right next to the admin KPIs which *are* correctly live-computed. This is the first thing a technician sees every time they log in. Fix: wire to `usePlannerJobs`, `useCocRequests`, real certificate records, and a rewards source.
3. **No way to mark a job "completed" — the guided path into CoC requests never fires.** The "Request CoC" button only appears when `job.status === 'completed'`, but nothing anywhere (no PATCH endpoint, no UI action) ever transitions a job out of `'scheduled'`. Fix: add a "Mark Complete" action + PATCH `/api/planner-jobs/:id`.
4. **FieldToolkit ships permanent fake demo logs that get written to the same store as real DB data**, producing two contradictory panels on one dashboard page (localStorage-sourced "Refrigerant Activity" table vs. API-sourced "Gas Usage by Job Type" chart, same page, different numbers). Fix: drop the localStorage mirror and seed data; source both panels from `/api/gas-logs`.
5. **Vendor reorder's two-stage HEVACRAZ→NOU approval has no real separation of authority.** Both approval endpoints gate on the same `org_admin` role — there's no `nou`/`hevacraz` role distinction anywhere in the schema, and the approvals page has a dead `const isHevacraz = true;` implying a split was intended but never built. Any single admin can rubber-stamp both stages. Fix: add a distinct reviewer role/permission for the NOU stage.
6. **Reclamation records have no approve/reject workflow at all.** Every batch is created `pending` and can never move to `passed`/`failed` — purity/quality gating for reclaimed refrigerant is non-functional (unlike cylinders and permits, which both have real review steps). Fix: add a PATCH/approve/reject route + admin UI action, mirroring the cylinders pattern.
7. **"Manage Courses" is fully built but unreachable from the UI.** The real nav config lives in `lib/nav.ts`, which nothing actually imports — `Sidebar.tsx` is what renders, and it has no entry for `/learn/manage` for trainer/lecturer, even though middleware protects the route and the page itself (course CRUD, uploads, grading) works. Trainers/lecturers can only reach it by guessing the URL. Fix: add the sidebar item, delete the dead `lib/nav.ts`.
8. **Lecturers get the student LMS view, not their own.** `/learn/page.tsx` only special-cases `role === 'trainer'`, excluding `lecturer` — combined with #7, a lecturer has *no discoverable path at all* into course authoring. Fix: branch on `trainer || lecturer`.

## Tier 2 — High: real functional gaps and broken links

9. **Admin's `/jobs` page has an entire admin-only UI branch that middleware makes unreachable** (`/jobs` is `technician`-only in `middleware.ts`, but the page has a `session.role === 'org_admin'` branch that can never render). Either wire admins into the route or delete the dead branch.
10. **Two dead redirect-stub pages are still live Admin nav items** — "Technician Directory" and "Certification Engine" render a spinner and immediately `router.replace()` elsewhere, causing a confusing flash-redirect. Remove the stubs and nav entries; point directly at the real destinations.
11. **Reporting's "Course Pipeline → View" links to the dead stub above instead of the real course-approval queue** (`/learn/approvals`). One-line fix, but currently sends admins to a broken flow.
12. **Three overlapping admin user-directory surfaces.** System Users (newest, full CRUD) vs. Lecturer/Student directories (read-only, same underlying data) vs. Technician Directory (the dead stub from #10) — should collapse into one filterable view.
13. **Refrigerant analytics dashboard is blind to 4 of the compliance modules built this session.** It only aggregates `gas_usage_logs` and `planner_jobs` — never `cylinders`, `trade_permits`, `reclamation_records`, or `recycling_records`. Structural disconnect, not a missing chart.
14. **Exams are broken end-to-end from both directions.** Certifications' "Start Exam" is a fake `setTimeout` with no real content; separately, there is no student-facing exam-submission UI anywhere, so the trainer's gradebook (which is otherwise real and correctly wired) is permanently empty. Either build the real flow or hide both halves until it exists.
15. **FieldToolkit "Installations" are localStorage-only** — no DB table, no API route. A genuine unmigrated feature, not a cache.
16. **Vendor sale submissions write a synthetic entry into the *technician's* localStorage key**, which never reaches any actual technician device/account — dead code creating the illusion of a synced audit trail that doesn't exist.
17. **Supplier NOU compliance quota fields (`usagePercent`, `quotaStatus`) are hardcoded to zero forever** — the "NOU flags" feature that's supposed to surface at-risk suppliers can structurally never trigger.

## Tier 3 — Medium: consistency and integrity fixes

18. Vendors self-attest "reported to NOU" / "shared with client" on their own ledger entries with zero counter-signature — undermines the point of ledger-based compliance tracking.
19. `middleware.ts`'s `ROUTE_ROLE_RULES` lists generic prefixes (`/admin`) before specific sub-rules (`/admin/lecturers`, etc.) — `.find()` first-match-wins makes the specific rules dead code. Harmless today (same role either way), but a landmine for the next person who adds a differently-scoped admin sub-route.
20. `createGasLogs` in `lib/api.ts` is the only mutation in the file that doesn't call `mutate(...)` to revalidate SWR cache afterward.
21. `.env.example` is missing `RESEND_API_KEY` and `NEXT_PUBLIC_SITE_URL` — a new deployer following the example file gets silently-broken invite emails and wrong canonical links.
22. Recycling module has no status field or review workflow at all — unclear if intentional (internal-only) or a gap; needs an explicit decision either way.
23. `refrigerantId` is nullable and not enforced as required server-side across cylinders/permits/reclamation/recycling (only the free-text label is required) — latent FK-integrity risk if a future form regresses to free text.
24. Removing a course attachment never calls the already-built `deleteMaterial` R2 function — orphaned files accumulate in the bucket forever.
25. Admin sidebar section is a flat, ungrouped 14-item list; every other section is thematically grouped.
26. Four components have zero imports anywhere: `Documentation.tsx`, `LanguageSwitcher.tsx`, `RoleGate.tsx`, `ServiceWorkerRegistrar.tsx`. `RoleGate` being unused is notable — suggests role-gating got reimplemented ad hoc per-page instead of centralized.
27. `ImageAnnotationWorkbench` stores full base64 images in localStorage only — quota risk and silent data loss on device change/cache clear.

## Tier 4 — Low: cosmetic/copy, low-urgency polish

28. Verify-buyer page shows leftover hardcoded demo registry hint text (real registration numbers/tokens that look usable but aren't).
29. `SupplierManagement.tsx` still says "records stay local to this demo environment" — stale copy from before the DB migration.
30. Vendor sidebar promotes the public signup form to already-approved, logged-in vendors instead of their real status page.
31. `/safety` page has no sidebar entry for technicians (only reachable via an admin-only dashboard quick action), and duplicates content already on the technician dashboard.
32. Technician dashboard Quick Actions omit Job Planner and Field Scheduling despite both being central, DB-backed workflows.
33. `TrainerLearningHub`'s "Expected Revenue" metric is self-labeled mock data — fine as-is, just flagging for awareness.
34. `STATUS_LABEL`/`STATUS_BADGE_MAP` constants duplicated across `learn/manage` and course-approvals pages instead of shared.
35. Admin dashboard mislabels the NOU Dashboard quick action as "Supplier Review" (it covers reorders and course approvals too).
36. Reporting, NOU Dashboard, and the main Admin Dashboard each independently re-fetch the same underlying datasets client-side — a maintenance/perf smell, not urgent.
37. Permit visibility has an edge case: a vendor whose email changes after submission loses visibility of past permits (filtered by email, not user id).
38. No "last synced" indicator when WhatGas refrigerant detail data is served stale during an API outage — safety-adjacent (ASHRAE/GWP data) but low probability.

---

## Suggested execution order

If tackling this as a real refactor pass, the natural grouping is:

1. **Data-flow fixes first** (items 1, 2, 4, 9, 16, 20) — these are all instances of the same root cause (pages reading stale localStorage instead of the DB-backed SWR hooks that already exist) and can likely be fixed together in one pass through `dashboard/page.tsx`, `jobs/page.tsx`, and `lib/api.ts`.
2. **Navigation/IA cleanup** (items 7, 8, 10, 11, 12, 25) — all sidebar/routing fixes, safe and mechanical, good second pass.
3. **Missing workflow steps** (items 3, 5, 6, 14, 17, 18, 22) — each is a genuine feature gap requiring a new endpoint/role/status field, best done module-by-module.
4. **Hygiene** (everything else) — dead code removal, copy fixes, `.env.example`, R2 cleanup — cheap, can be batched whenever convenient.

Want me to start on tier 1?
