# Technician Dashboard: Fact Sheet

**Page:** `/dashboard` (titled "My Dashboard")  |  **Role in system:** `technician`

## Purpose
Daily workspace for a registered HVAC-R technician: see completed jobs, track Certificate of Compliance (COC) requests, log refrigerant recovery, and keep registration, membership and certificates up to date.

## Who it's for
Registered refrigeration and air-conditioning technicians working in the field.

## KPI cards (top row)
| Card | What it shows | Follows the period filter? |
|---|---|---|
| Jobs Completed | Planner jobs marked completed whose scheduled date falls in the period | Yes |
| Pending COCs | COC requests you submitted that an administrator has not yet decided; the approved count is in the note | No, current |
| Refrigerant Recovered | Total kg of your recovery log entries in the period | Yes |
| COCs on Record | Approved Certificates of Compliance you hold; the note says how many expire within 30 days | No, current |

## Panels
- **Getting started checklist.** First steps for someone new: plan a job, log refrigerant use, request a COC, check your membership. It hides itself when everything is done, and can be dismissed.
- **Registration and membership.** Your registry number and status, your membership number and status, and for each the days left until expiry, with a clear warning when something is due or overdue. It also summarises your certificates: how many are valid, expiring within 90 days, or expired. If renewal is due, it tells you to email info@hevacraz.co.zw with your registry number.
- **Upcoming Schedule.** Your next scheduled planner jobs, linking to the Planner tab.
- **Certifications.** Up to five recent COC records with their expiry status.
- **Refrigerant Activity.** A table of your recent gas-log entries (client, action, amount), linking to the Field Toolkit.

## Quick actions
Field Operations, Field Toolkit, Jobs & Logs, Certifications.

## Menu items available
Dashboard, Learning Hub, Safety Center, Field Operations, Field Toolkit, WhatGas + Risk Engine, Sizing Tool, Refrigerant Catalogue, Certification, Rewards, plus an Emergency Mode button in the sidebar.

## Key tools
- **Field Operations:** three tabs: Schedule, Planner, Jobs & Logs.
- **Job Planner** and **Request COC** (`/jobs/request-coc`).
- **Sizing Tool:** cooling-load calculator for freezers and cold rooms.
- **WhatGas + Risk Engine:** refrigerant lookup and risk checks.

## Notifications
You are notified in the app when a COC request is approved or not approved, when a certificate is issued for you, and when your account is first approved.

## Notes for the fact sheet
- The Registration and membership panel finds your registry record by matching your login email to the email on your registry record. If none matches, it says so and points to HEVACRAZ.
- Technicians do not see supplier, admin or permit pages.
