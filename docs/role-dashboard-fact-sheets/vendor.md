# Vendor / Supplier Dashboard: Fact Sheet

**Page:** `/dashboard` (titled "My Dashboard")  |  **Role in system:** `vendor`

## Purpose
Gives refrigerant suppliers one place to reorder gas, file compliance certificates, check buyers, and see the value of their transactions, with HEVACRAZ and NOU (National Ozone Unit) review built in.

## Who it's for
Registered refrigerant distributors and suppliers. Suppliers register themselves from the Join page (or are invited), then an administrator approves them.

## KPI cards (top row)
| Card | What it shows | Follows the period filter? |
|---|---|---|
| Pending Reorders | Reorders still waiting for HEVACRAZ or NOU review | No, current |
| Approved Volume | Quantity on your approved reorders created in the period; the note shows how many | Yes |
| Compliance Certificates | Approved compliance applications; the note shows how many are pending | No, current |
| Ledger Value | Value of your ledger transactions dated in the period, with the transaction count | Yes |

## Panels
- **Monthly compliance reminder.** A green notice when this month's compliance certificate has been submitted, or an amber prompt with a link when it has not.
- **Recent Reorders.** Your latest reorders with gas, quantity and status.
- **Compliance Certificates.** Recent compliance applications by certificate type.
- **Recent buyer checks.** Your latest technician verifications and their results, with a link to verify another buyer.

## Quick actions
Reorder Gas, Compliance, Verify Buyer, Rewards.

## Menu items available
Dashboard, Refrigerant Catalogue, Rewards, Supplier Compliance, Supply Reports, Vendor Reorder, Verify Buyer, Certificate Verification.

## Reorders
- A reorder is either a **purchase of new stock** or a **return of recovered refrigerant**. You choose when you submit it, and NOU reporting uses that choice.
- The server checks the quantity (greater than zero, at most 100,000 kg), the refrigerant and the purpose.
- Reorders go through two reviews, HEVACRAZ first, then NOU. You are notified in the app at each stage and if a reorder is rejected, with the reason.

## Key tools
- **Vendor Reorder** (`/suppliers/reorder`) and **Verify Buyer** (`/suppliers/verify-buyer`): vendor-only.
- **Supplier Compliance Hub:** submit and track compliance applications.
- **Supply Reporting** (`/suppliers`).

## Notes for the fact sheet
- Your annual import quota is set by an administrator. Until one is set, NOU shows "No quota set" for your company.
- Vendors cannot see technician, course or admin pages.
