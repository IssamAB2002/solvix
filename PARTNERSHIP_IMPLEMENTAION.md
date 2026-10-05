# Partnership Feature — Implementation Plan

## 1. Overview

Solvix builds custom software and combined digital/AI solutions. Instead of paying salaries, it works with **Partners** (who bring in clients/requests) and **Developers** (who build the projects) on a **percentage-of-income** basis. Admins/CEO also take a percentage share of what the company earns on each order.

Today, the Direction panel (`/solvix-dir`) has no way to:
- Attribute an order to the Partner who brought it or the Developer who is building it.
- Calculate what % of an order's income belongs to that Partner/Developer vs. Solvix.
- Give Partners/Developers restricted, scoped access to "their" orders and earnings.
- Track what Solvix currently owes a Partner/Developer (open balance) and record when that's paid out.

This feature adds that attribution, percentage calculation, and a scoped Direction-panel view for Partners/Developers, plus an Invoices ledger to record salary (commission) payouts, project payments, general incomes, and expenses.

## 2. Goals

1. Every order can optionally be linked to one Partner and/or one Developer, each with their own commission %.
2. The Direction panel automatically computes each person's earned share from the payments received on their orders.
3. Partners and Developers get login access to the Direction panel, but scoped to their own orders, with permissions narrower than Admin/CEO.
4. Admins/CEO can record payouts ("Salaries") against a Partner/Developer, which reduces their open balance.
5. Assignment is **optional** — orders with no Partner/Developer attached behave exactly as they do today (no % calculation).

## 3. Data Model Changes

### 3.1 `users` table — new role
Add `'partner'` to `STAFF_ROLES` (`backend/src/routes/auth.js`), alongside the existing `'ceo' | 'admin' | 'developer'`.
- CEO can create `partner` and `developer` accounts via the existing `POST /staff` endpoint (role param extended to accept `partner`).
- `requireStaff` already allows any staff role — reused as-is for "logged in to Direction" checks.
- New middleware `requirePartnerOrDeveloper` (or inline checks) for endpoints that must exclude `ceo`/`admin`-only actions.

### 3.2 `orders` table — new columns
Add to the existing schema (`backend/src/db.js`, both SQLite and Postgres definitions):

| Column | Type | Notes |
|---|---|---|
| `partner_id` | INTEGER, nullable, FK → `users.id` | Who brought the request |
| `partner_pct` | REAL, nullable | 0–100, set when `partner_id` is set |
| `developer_id` | INTEGER, nullable, FK → `users.id` | Who builds the project |
| `developer_pct` | REAL, nullable | 0–100, set when `developer_id` is set |

Rules:
- Both fields are independent and optional — an order can have a Partner only, a Developer only, both, or neither.
- If `partner_id`/`developer_id` is null, the corresponding `_pct` is ignored and no share is calculated for that role on that order (matches: *"If the Order has no attributes, the calculation of % will not occur"*).
- `partner_pct` + `developer_pct` are **not** required to sum to 100 — the remainder is implicitly Solvix's share.

### 3.3 New `invoices` table
A general ledger table backing the Invoices tab:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `category` | TEXT | one of `salary`, `payment`, `income`, `expense` |
| `order_id` | INTEGER, nullable, FK → `orders.id` | required for `payment`; optional for `salary` (a salary can span general commission, not just one order) |
| `user_id` | INTEGER, nullable, FK → `users.id` | required for `salary` — the Partner/Developer being paid out |
| `amount` | REAL | |
| `currency` | TEXT | `dzd` / `usd`, reuse existing currency convention |
| `note` | TEXT, nullable | |
| `created_by` | TEXT | staff name, same convention as `payments.created_by` |
| `created_at` | DATETIME | |

Behavior per category:
- **Payments (Projects):** functionally the same record as today's `payments` table entry (order-scoped, affects `amountPaid`/progress). To avoid two sources of truth, a `payment`-category invoice **also inserts a row into the existing `payments` table** (or the `payments` table is deprecated in favor of filtering `invoices WHERE category='payment'` — see §7 Migration Notes for the recommended path).
- **Salaries (% partnership):** records money paid out to a Partner/Developer. Requires `user_id`. Reduces that person's **open balance** (see §5).
- **Incomes (General):** company-level income not tied to a specific order (e.g. consulting, misc revenue). No `order_id`/`user_id`.
- **Expenses (General):** company-level costs. No `order_id`/`user_id`.

## 4. Backend API Changes

### 4.1 `POST /requests/:id/approve` (`backend/src/routes/requests.js`)
Extend the request body to optionally accept:
```json
{ "projectType": "...", "description": "...", "totalBudget": ..., "kind": "...",
  "partnerId": 12, "partnerPct": 15,
  "developerId": 7, "developerPct": 20 }
```
`createOrder(...)` is extended to persist these four fields on the new order. All four remain optional (per the spec: assignment at accept time is optional, not mandatory).

### 4.2 `PUT /orders/:id` (`backend/src/routes/orders.js`)
- **Admin/CEO:** can set/change `partnerId`, `partnerPct`, `developerId`, `developerPct` at any time after creation (not just at accept-time), plus all fields they can edit today.
- **Developer:** keep the current restriction (`status`, `progressPct` only) and extend it to also allow feature CRUD and budget-sync actions scoped to their own order (see §6.2) — but never partner/developer assignment or payment fields.
- **Partner:** no write access to orders at all (read-only).

### 4.3 New `GET /orders?scope=mine` (or filter existing `GET /orders`)
When the caller's role is `partner` or `developer`, the orders list/detail endpoints automatically filter to `WHERE partner_id = :uid OR developer_id = :uid`. Admin/CEO continue to see everything.

### 4.4 Invoices endpoints (new `backend/src/routes/invoices.js`)
- `GET /invoices` — Admin/CEO see all; Developer/Partner see only `salary` invoices where `user_id = self` (their own payout history) plus `payment` invoices for orders they're attached to (read-only, matches "CAN SEE PAYMENTS, BUT CAN'T ADD/DELETE/MODIFY").
- `POST /invoices` — Admin/CEO only.
- `PUT/DELETE /invoices/:id` — Admin/CEO only.

### 4.5 Balances endpoint
`GET /balances` (or computed client-side from `orders` + `invoices` already loaded by `reload()` in `Dashboard.jsx`):
```
earned(user) = Σ over orders where user is partner/developer:
                 amountPaid(order) * (their_pct / 100)
paidOut(user) = Σ invoices where category='salary' AND user_id = user.id
openBalance(user) = earned(user) - paidOut(user)
```

## 5. Percentage & Balance Calculation Logic

- **Share basis:** percentages apply to **`amountPaid`** (money actually received, already computed from `payments`/`invoices`), not the order's total budget — so a Partner/Developer's earned share grows as the client actually pays, matching how Solvix itself only has real income once payment lands.
- **Per-order share:** `partnerShare = amountPaid(order) * partner_pct/100`, `developerShare = amountPaid(order) * developer_pct/100`.
- **Open balance** (shown on the Overview tab) = lifetime earned share across all their orders − lifetime `salary` invoices paid to them. This is the amount Solvix currently owes that person.
- Admins/CEO see a global income breakdown (total revenue vs. total committed to Partners/Developers vs. Solvix's net).

## 6. UI Changes — Direction Panel (`frontend/src/dashboard/Dashboard.jsx`)

Scope rule used throughout: when `currentUser.role` is `partner` or `developer`, every tab's data is pre-filtered to orders where they are `partner_id`/`developer_id`, **except** Income Requests, which they see in full (read-only).

### 6.1 Overview Tab
- All summary cards/tabs (Active Projects, Delivered, Income Requests, Open Balances) scope to the logged-in Partner/Developer's orders — except Income Requests, which shows all requests.
- Add a new **Open Balance** card showing their current amount owed (per §5).
- "Last active project" card shows the most recently updated order attributed to them.

### 6.2 Projects Tab
- List scoped to orders where they are `partner_id` or `developer_id`.
- **Partner:** read-only — can open/view a project's detail, features, budget, and payment history, but every action control (status, progress, features, payments) is hidden/disabled.
- **Developer:** can change order `status`, edit `progress_pct`, and Add/Edit/Delete `order_features`, and trigger "Sync Budget with Features" (recomputing `total_budget` from feature prices, matching whatever existing sync action Admin has today). Can **view** the payments list for the order but has no Add/Edit/Delete controls on it.
- **Admin/CEO:** unchanged full access, plus the new Partner/Developer assignment controls (select Partner, select Developer, set each `%`) on the order edit form.

### 6.3 Income Requests Tab
- Partner/Developer: see the full list of all requests (not scoped), read-only — no Approve/Cancel buttons.
- Admin/CEO: unchanged Approve/Cancel flow, **extended** with an optional "Assign Partner / Developer" section in the Approve modal — dropdowns for Partner and Developer (populated from `users` filtered by role) plus a `%` input for each, both optional. Leaving them blank creates the order exactly as today (no attribution, no % calculation).

### 6.4 Clients CRM Tab
- Partner/Developer: rows scoped to clients whose orders are attributed to them.
- Admin/CEO: unchanged, sees all clients.

### 6.5 Invoices Tab
- **Admin/CEO:**
  - "Record New Invoice" form gets a **Category** selector: `Salaries (% partnership)`, `Payments (Projects)`, `Incomes (General)`, `Expenses (General)`.
  - When category = `Salaries`, show a **Partner/Developer** select (any `partner`/`developer` user) — the amount entered here is a payout against that person's open balance, and the form can show their current open balance inline as a hint (e.g. "Open balance: 42,000 DZD") before submitting.
  - When category = `Payments`, keep today's existing order-picker + amount + note flow.
  - When category = `Incomes`/`Expenses`, just amount + note (no order/person link).
  - List view gets a Category column/filter.
- **Partner/Developer:** read-only list, filtered to: their own `salary` invoices (payout history) and `payment` invoices on orders attributed to them. No create/edit/delete controls rendered.

## 7. Migration Notes

1. **DB migration** (`migrate()` in `backend/src/db.js`): add `partner_id`, `partner_pct`, `developer_id`, `developer_pct` nullable columns to `orders`; create the `invoices` table. Idempotent across SQLite/Postgres/Mongo drivers, following the existing pattern used for the `requests.status` column migration.
2. **Payments vs. Invoices overlap:** recommend migrating existing `payments` rows into `invoices` as `category='payment'` rows on rollout, then pointing `InvoicesTab`'s "Payments" category and the existing `amountPaid` computation at `invoices` instead of maintaining two tables. If that migration is deferred, keep both tables in sync for this release (every `payment`-category invoice write also writes a `payments` row) and revisit consolidation later.
3. **Role rollout:** CEO creates the first `partner` accounts manually via the existing staff-creation flow (`POST /staff`) once `'partner'` is added to `STAFF_ROLES`.
4. **Backward compatibility:** orders created before this feature ships simply have `partner_id`/`developer_id` as `null` — they display and behave exactly as before, with no % calculation, confirming the "optional" requirement.

## 8. Open Questions (for client/CEO sign-off before build)

- Should a Partner/Developer's `%` be editable by Admin after the order has already received payments (retroactively changing past-earned shares), or only apply going forward from the moment it's set?
- Can a single order have the *same* person as both Partner and Developer (e.g. a developer who also brought the client), and if so do both percentages apply independently?
- Currency for Salary invoices — always DZD, or should it follow the order's original request currency?
