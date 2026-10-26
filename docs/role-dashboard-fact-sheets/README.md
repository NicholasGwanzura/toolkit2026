# ZimHVAC Dashboard Fact Sheets

Describes the role dashboards of the Zimbabwe HVAC Compliance Registry (zimhvacregistry.org) as built in code version `b95cd16` (10 October 2026). Written from the application code, not from a logged-in session, so check screenshots against the live site before publishing. Some items go live only when that version is deployed.

## Roles

| Role | Sheet | Dashboard focus |
|---|---|---|
| Technician | [technician.md](technician.md) | Jobs, certificates (COC), refrigerant logs, membership and renewal |
| Trainer / Assessor | [trainer-lecturer.md](trainer-lecturer.md) | Courses, enrolments, grading, certificate requests |
| Lecturer | [trainer-lecturer.md](trainer-lecturer.md) | Same dashboard as Trainer |
| Vendor / Supplier | [vendor.md](vendor.md) | Gas reorders, compliance certificates, ledger, buyer checks |
| Organization Admin | [org-admin.md](org-admin.md) | Action queue, registry, approvals, NOU oversight, reporting |
| Student | [student.md](student.md) | Enrolled courses, progress, exam results |
| Contractor | [contractor.md](contractor.md) | Same field tools as Technician, plus onboarding |

## How the dashboards work (shared facts)

- Everyone lands on `/dashboard` after login. It is titled **My Dashboard** for every role except Organization Admin, which is titled **Admin Dashboard**.
- Each role sees a row of KPI cards, then Quick Actions, then role-specific panels. Every card has a "How this is counted" note.
- **The Today / This Week / This Month filter** (last 24 hours, 7 days, 30 days) changes only the cards that measure activity, such as jobs completed or volume ordered. Cards that show a current state, such as pending approvals, ignore it, and say so in their note.
- **Loading and errors.** While data loads a card shows an ellipsis. If it fails to load, the card shows a dash and a red banner names what could not be loaded. A failed load is never shown as zero.
- **Notifications.** The bell in the top bar shows a live unread count. People are notified in the app when a COC, course, exam, certificate request or reorder is decided, and when their application is approved. Admins also get the application alerts described in the Organization Admin sheet.
- Menu items and pages are limited by role. A role that opens a page it is not allowed to see is blocked.
- Some pages are public and need no login: certificate verification (`/verify-technician` and `/verify-coc`).

## How people get an account

Technicians, students, suppliers, trainers, lecturers and contractors register themselves from the **Join** page (`/join`). Each applicant confirms their email address first, can then upload supporting documents (ID, certificates, licences), and waits for an administrator to approve. They are emailed the decision, and if approved they log in with the password they chose. **Organization Admin accounts cannot be self-registered**; an existing administrator invites them from the Invites page.

## Shared pages by role

| Page | Technician | Trainer / Lecturer | Vendor | Org Admin | Student | Contractor |
|---|---|---|---|---|---|---|
| Dashboard | Yes | Yes | Yes | Yes | Yes | Yes |
| Learning Hub | Yes | Yes | | Yes | Yes | Yes |
| Safety Center | Yes | Yes | | Yes | Yes | Yes |
| WhatGas + Risk Engine | Yes | Yes | | Yes | Yes | Yes |
| Refrigerant Catalogue | Yes | Yes | Yes | Yes | Yes | Yes |
| Certification | Yes | Yes | | Yes | Yes | Yes |
| Rewards | Yes | | Yes | Yes | | Yes |
| Certificate Verification | | Yes | Yes | Yes | | Yes |
