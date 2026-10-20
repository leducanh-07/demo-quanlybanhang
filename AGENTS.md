# AGENTS.md

## Overview
Management system for a street food cart / small shop selling fried fish balls and snacks in Vietnam.
- **STATION Account**: Logged in permanently at the shop computer/tablet. Handles attendance clock-in/out and daily stock/closing.
- **OWNER Account**: Remote access from phone/laptop. Monitors live attendance, mid-shift stock counts, revenue, alerts, reports, and manages menu/staff.
- Attendance and Stock/Revenue are independent features. Stock belongs to a business DAY, not to an employee shift.

## Tech Stack
- **Framework**: Next.js 15 (App Router), TypeScript (strict mode), Tailwind CSS
- **Database**: MySQL 8.0.16+ accessed via `mysql2/promise` (connection pool with `timezone: '+07:00'` and `dateStrings: true`). No ORM.
- **Validation & Auth**: Zod for input validation; signed httpOnly SameSite=Lax JWT cookies (`jose`) with embedded `session_version`; bcryptjs password hashing.
- **Testing**: Vitest for unit tests.
- **Timezone**: Vietnam local time (`Asia/Ho_Chi_Minh`, UTC+7) stored as strings (`YYYY-MM-DD HH:MM:SS` and `YYYY-MM-DD`). Never convert to UTC.

## Database Rules
- Real database is pre-created; NEVER run CREATE/ALTER/DROP/TRUNCATE or migrations. Do not delete existing rows.
- Schema documentation introspected in `docs/DB_SCHEMA.md`.
- Virtual/Stored generated columns (`open_employee_id`, `sold_qty`, `subtotal`) are NEVER inserted or updated; only SELECT.
- Revenue is computed on the fly: `revenue(day) = SUM(daily_stock.subtotal)`; `variance = cash_counted - revenue`.

## Business Rules & Formulas
1. `sold_qty = import_qty + restock_qty - waste_qty - ending_qty` (NULL until ending_qty is set).
2. `subtotal = sold_qty * unit_price` (using unit_price snapshot taken at day start).
3. Attendance: 1 button toggle. One open shift per employee enforced by MySQL `uq_shifts_open_employee`.
4. Day closing: Runs in ONE DB transaction requiring ending_qty for EVERY active item and cash_counted.
5. Locks: Closed days are locked for STATION; only OWNER can reopen or edit (fully audited in `audit_logs`).
6. Login throttling: In-memory, 5 failed attempts per username+IP => locked 5 minutes.
7. Constants: `VARIANCE_ABS_VND = 20000`, `VARIANCE_PCT = 3`, `FORGOTTEN_SHIFT_HOURS = 14`, `STALE_COUNT_HOURS = 3`.
8. Permissions: OWNER cannot clock in/out; STATION cannot view revenue history or owner dashboards.
