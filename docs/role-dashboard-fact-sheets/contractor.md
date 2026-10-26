# Contractor Dashboard: Fact Sheet

**Page:** `/dashboard` (titled "My Dashboard")  |  **Role in system:** `contractor`

## Purpose
Gives trade contractors the same day-to-day tools as technicians (jobs, installations, refrigerant logs, COC requests, sizing and learning), plus a prompt to finish their business profile if they were invited.

## Who it's for
Trade contractors: installation, ductwork, electrical, piping and brazing, insulation, and general contracting. Contractors register themselves from the Join page, giving their company, trade, team size, services and safety certification, then an administrator approves them. An administrator can also invite a contractor, who then completes the onboarding form.

## Dashboard
The dashboard is the Technician dashboard; see [technician.md](technician.md) for the full detail.

| Card | What it shows | Follows the period filter? |
|---|---|---|
| Jobs Completed | Planner jobs completed in the period | Yes |
| Pending COCs | Submitted COC requests awaiting an administrator | No, current |
| Refrigerant Recovered | kg recovered in your log entries in the period | Yes |
| COCs on Record | Approved COCs and how many expire within 30 days | No, current |

Panels: getting-started checklist, Registration and membership (shown if a registry record is linked to your email), Upcoming Schedule, Certifications, Refrigerant Activity.

## Contractor-only items
- **Onboarding banner.** A contractor who was invited and has not finished onboarding sees an amber banner linking to `/contractor-onboarding`. The form collects company name, contact name and phone (required), trade specialization, years in operation, team size, safety certification, services offered, and the biggest challenge.
- Administrators manage contractors under Admin, Contractors.

## Menu items available
Dashboard, Learning Hub, Safety Center, Field Operations, Field Toolkit, WhatGas + Risk Engine, Sizing Tool, Refrigerant Catalogue, Certification, Rewards, Certificate Verification, and the Emergency Mode button.

## How it differs from a Technician
- A contractor is a business account; a technician is an individual in the Technician Registry.
- Contractors do not appear in the registry and have no registry number or QR credential.
- Their jobs, logs and COC requests are saved under their own login, separate from any technician's records.

## Notes for the fact sheet
- Contractors still cannot open supplier, course-management or admin pages.
- Whether a contractor's COC requests should carry the same authority as a registered technician's is an open policy question for the administrators.
