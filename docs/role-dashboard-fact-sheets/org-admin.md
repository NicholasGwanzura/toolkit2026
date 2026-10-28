# Organization Admin Dashboard: Fact Sheet

**Pages:** `/dashboard` ("Admin Dashboard"), `/admin` (Compliance Report), `/nou-dashboard` (NOU Dashboard)  |  **Role in system:** `org_admin`

## Purpose
Program-wide oversight: see everything that needs your action, monitor the technician registry, approve applications, courses, certificates, suppliers and reorders, and report on refrigerant volumes.

## Who it's for
HEVACRAZ program administrators. This is the highest role in the app. There is no separate super-admin, and administrator accounts cannot be self-registered: an existing administrator invites them from the Invites page.

## Admin Dashboard (`/dashboard`)
The header has a Today / This Week / This Month filter and a province filter.

### Needs your action
The first panel lists everything waiting on an administrator, with a count and a link for each item that has something waiting. It refreshes every minute. When nothing is waiting it says you are all caught up.

| Item | Where it links |
|---|---|
| Registration applications to review (applicants who have confirmed their email; a note says how many more are waiting on the applicant) | Applications |
| Emails that failed, bounced or were marked as spam | Email Log |
| COC requests to review | COC Requests |
| Certificate requests to approve, and approved certificates to issue | Certifications |
| Courses awaiting approval | Course Approvals |
| Refrigerant reorders to review | NOU Dashboard |
| Supplier compliance certificates to review | Supplier Compliance |
| Accident reports still open or under investigation | Accidents Module |
| Reward requests to fulfil | Rewards |

### KPI cards
| Card | What it shows | Follows the filters? |
|---|---|---|
| Active Techs | Technicians marked active | Province only |
| Total Technicians | Everyone in the registry | Province only |
| Pending Reorder Reviews | Reorders waiting for HEVACRAZ or NOU, all provinces | Neither |
| Provinces | Provinces with registered technicians | Province only |
| Refrigerant Reordered | Quantity on reorders created in the period (what was requested, not used) | Period only |

These figures are counted in the database, so the page stays fast as the registry grows.

**Quick actions:** NOU Dashboard, COC Requests, Supplier Management, Safety Oversight.

## Compliance Report (`/admin`)
- **Period selector:** Year to date (default), Last 12 months, All time. The cards, chart and PDF follow it.
- **Cards:** GWP of Approved Reorders (potential impact of what was bought), Approved Volume (with the pending backlog right now), Active Technicians (with valid certificates), Natural Gas Share (share of approved volume that is R-290, R-600a, R-744, R-717 or R-1270).
- **Chart:** Refrigerant Purchased, approved reorder volume per month. Rejected and pending reorders are not included.
- **Leak Repairs, last 30 days:** the count and the latest five, taken from technicians' Field Toolkit logs.
- **Certificates expiring soon:** active technicians' certificates due within 90 days or already overdue, soonest first.
- **Export PDF** and the occupational accidents section. Links at the top go to the **Admin Dashboard** and **Invite users**.
- The figures are aggregated by the database, so the page does not download the registry or reorder history.
- If the report fails to load, a banner says so, so partial figures are not mistaken for final ones.

## NOU Dashboard (`/nou-dashboard`)
- **KPI cards:** Registered Technicians; Purchased Kg (approved purchase reorders); Recovered Kg (technicians' recovery logs in the field plus approved recovery returns from suppliers, split out in the note); Emissions Avoided (recovered kg times each gas's warming potential, in tonnes of CO2-equivalent, all time).
- **Supplier quotas.** Each approved supplier shows kilograms sold this calendar year against the annual import quota you set for them. Use **Set annual quota** on a supplier to enter or change it. A supplier with no quota shows "No quota set". Reaching 85% shows "near limit" and 100% "exceeded".
- Other panels: Pending NOU Actions, Recent System Activity, Refrigerant Volumes Approved YTD, Refrigerant Breakdown, Monthly Purchase vs Usage, Supplier Review and Network, Discrepancy Alerts, Vendor-linked logs, Supplier compliance certificates, Grey Market Detection, Regional Snapshot.

## Applications (`/admin/applications`)
- **Lanes:** Students, Technicians, Trainers/lecturers/contractors, Suppliers. Each tab shows how many applications are ready for review.
- **Filter and search:** Needs action (default), Approved, Rejected, All, and a search over name and email.
- **Email not confirmed.** Applicants must click a confirmation link before they can be approved; unconfirmed ones show an amber flag and their Approve button is disabled. You can still reject them.
- **Documents.** "View uploaded documents" on an application lists the ID or certificates the applicant uploaded, each as a download.
- **Reject** asks for two notes: a message to the applicant, which is emailed to them, and an internal note that is never emailed.
- Approval creates the account and emails the applicant. Errors, such as an account that already exists, are shown on the page.

### How you are alerted to new applications
1. An email to every active administrator as soon as someone applies, with the applicant's details and a Review button.
2. Live counts on the matching sidebar items.
3. The Needs your action panel on the dashboard.

## Other approvals
- **Course Approvals** (`/learn/approvals`): approve or reject pending courses with a reason, and **Return for correction** on an approved course (a reason is required; the author is notified and can edit and resubmit).
- **COC Requests**, **Certifications** (approve, then issue), **Supplier Approvals**, **Invites**, **Memberships**.
- Certificate requests are labelled either **Linked to graded exam** or **Manual entry**.

## Menu (grouped)
- **Home:** Dashboard, Compliance Report
- **Operations:** Learning Hub, Events Calendar, Manage Courses, Field Operations, Field Toolkit, Safety Center
- **Tools:** WhatGas + Risk Engine, Sizing Tool
- **Refrigerants:** Catalogue
- **Suppliers:** Supplier Management, Invite Supplier, Supplier Compliance, Vendor Reorder, Verify Buyer, Supplier Approvals
- **Registry and People:** Technician Registry, Student Directory, Certificate Verification, Certifications, Rewards, System Users, Applications, Applicants, Memberships, Email Log, Contractors, Invites
- **Reviews and Data:** NOU Dashboard, Course Approvals, COC Requests, Accidents Module, Reporting, Refrigerant Analytics, Refrigerants (WhatGas Sync)

## Notes for the fact sheet
- The Admin sidebar is separate from every other role's sidebar.
- Only an administrator can open System Users, Applications, Invites, Memberships, Email Log, Reporting, Accidents, Contractors, Students, Lecturers and Certification Engine.
- Emergency Mode is hidden for this role.
- Every application email is recorded in the Email Log page.
